import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function getValidToken(
  supabase: any,
  userId: string,
  clientId: string,
  clientSecret: string
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("google_access_token, google_refresh_token, google_token_expires_at")
    .eq("id", userId)
    .single();

  if (!profile?.google_refresh_token) return null;

  const expiresAt = new Date(profile.google_token_expires_at).getTime();
  const now = Date.now();

  // If token expires in less than 5 minutes, refresh it
  if (now > expiresAt - 5 * 60 * 1000) {
    const newTokens = await refreshAccessToken(
      profile.google_refresh_token,
      clientId,
      clientSecret
    );
    if (!newTokens) return null;

    const newExpiry = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();
    await supabase
      .from("profiles")
      .update({
        google_access_token: newTokens.access_token,
        google_token_expires_at: newExpiry,
      })
      .eq("id", userId);

    return newTokens.access_token;
  }

  return profile.google_access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointment_id, operation, user_id } = await req.json();

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get valid access token
    const accessToken = await getValidToken(supabase, user_id, clientId, clientSecret);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Token Google inválido. Reconecte o Google Calendar." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get appointment data
    const { data: appointment, error: aptError } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointment_id)
      .single();

    if (aptError || !appointment) {
      return new Response(
        JSON.stringify({ error: "Agendamento não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const calendarApiBase = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    // DELETE
    if (operation === "delete") {
      if (appointment.google_event_id) {
        await fetch(`${calendarApiBase}/${appointment.google_event_id}`, {
          method: "DELETE",
          headers,
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build event body
    const startDate = new Date(appointment.scheduled_for);
    const endDate = new Date(startDate.getTime() + (appointment.duration_minutes || 45) * 60000);

    const eventBody: any = {
      summary: appointment.title || `${appointment.appointment_type} - ${appointment.client_name}`,
      description: [
        appointment.description,
        `Cliente: ${appointment.client_name}`,
        appointment.client_email ? `Email: ${appointment.client_email}` : "",
        appointment.client_phone ? `Telefone: ${appointment.client_phone}` : "",
        appointment.company_name ? `Empresa: ${appointment.company_name}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      start: {
        dateTime: startDate.toISOString(),
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: "America/Sao_Paulo",
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 60 },
          { method: "popup", minutes: 15 },
        ],
      },
    };

    // Request Google Meet link for online appointments
    if (appointment.location_type === "online") {
      eventBody.conferenceData = {
        createRequest: {
          requestId: appointment.id,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    } else if (appointment.physical_address) {
      eventBody.location = appointment.physical_address;
    }

    // CREATE
    if (operation === "create") {
      const conferenceParam = appointment.location_type === "online" ? "?conferenceDataVersion=1" : "";
      const res = await fetch(`${calendarApiBase}${conferenceParam}`, {
        method: "POST",
        headers,
        body: JSON.stringify(eventBody),
      });

      if (!res.ok) {
        const errData = await res.json();
        console.error("Google Calendar create error:", errData);
        return new Response(
          JSON.stringify({ error: "Erro ao criar evento no Google Calendar" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const event = await res.json();

      // Save google_event_id and meet link
      const updateData: any = { google_event_id: event.id };
      if (event.conferenceData?.entryPoints?.[0]?.uri) {
        updateData.meeting_link = event.conferenceData.entryPoints[0].uri;
      }

      await supabase
        .from("appointments")
        .update(updateData)
        .eq("id", appointment_id);

      return new Response(
        JSON.stringify({ success: true, event_id: event.id, meeting_link: updateData.meeting_link }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // UPDATE
    if (operation === "update" && appointment.google_event_id) {
      const res = await fetch(`${calendarApiBase}/${appointment.google_event_id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(eventBody),
      });

      if (!res.ok) {
        console.error("Google Calendar update error:", await res.text());
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Sync error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
