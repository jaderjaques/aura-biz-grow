import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChatList } from "@/components/inbox/ChatList";
import { ChatWindow } from "@/components/inbox/ChatWindow";
import { ChatSidebar } from "@/components/inbox/ChatSidebar";
import { EmptyState } from "@/components/inbox/EmptyState";
import { EscalationAlert } from "@/components/inbox/EscalationAlert";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

export default function InboxPage() {
  const [searchParams] = useSearchParams();
  const initialChat = searchParams.get("chat");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialChat);
  const [showSidebar, setShowSidebar] = useState(true);
  const [mobileShowChat, setMobileShowChat] = useState(!!initialChat);
  const isMobile = useIsMobile();

  function handleSelectChat(id: string) {
    setSelectedChatId(id);
    if (isMobile) setMobileShowChat(true);
  }

  function handleBack() {
    setMobileShowChat(false);
    setSelectedChatId(null);
  }

  function handleGoToChat(chatId: string) {
    setSelectedChatId(chatId);
    if (isMobile) setMobileShowChat(true);
  }

  return (
    <AppLayout>
      <div className="h-[calc(100vh-64px)] flex -m-4 md:-m-6 lg:-m-8">
        {/* Chat List */}
        <div
          className={`${
            isMobile && mobileShowChat ? "hidden" : "flex"
          } w-full md:w-[300px] lg:w-[320px] border-r flex-col shrink-0`}
        >
          <ChatList selectedChatId={selectedChatId} onSelectChat={handleSelectChat} />
        </div>

        {/* Chat Window */}
        <div
          className={`${
            isMobile && !mobileShowChat ? "hidden" : "flex"
          } flex-1 flex-col min-w-0`}
        >
          {selectedChatId ? (
            <ChatWindow
              chatId={selectedChatId}
              onBack={isMobile ? handleBack : undefined}
              onToggleSidebar={() => setShowSidebar((s) => !s)}
            />
          ) : (
            <EmptyState />
          )}
        </div>

        {/* Sidebar - Desktop only */}
        {!isMobile && showSidebar && selectedChatId && (
          <div className="hidden lg:flex w-[340px] border-l flex-col overflow-y-auto shrink-0">
            <ChatSidebar chatId={selectedChatId} />
          </div>
        )}

        {/* Sidebar - Mobile drawer */}
        {isMobile && selectedChatId && (
          <Sheet open={showSidebar && mobileShowChat} onOpenChange={setShowSidebar}>
            <SheetContent side="right" className="p-0 w-[85vw]">
              <ChatSidebar chatId={selectedChatId} />
            </SheetContent>
          </Sheet>
        )}
      </div>

      <EscalationAlert onGoToChat={handleGoToChat} />
    </AppLayout>
  );
}
