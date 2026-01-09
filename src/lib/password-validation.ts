/**
 * Lista das 100 senhas mais comuns para bloquear
 * Fonte: https://github.com/danielmiessler/SecLists
 */
const COMMON_PASSWORDS = [
  "123456", "password", "12345678", "qwerty", "123456789",
  "12345", "1234", "111111", "1234567", "dragon",
  "123123", "baseball", "abc123", "football", "monkey",
  "letmein", "696969", "shadow", "master", "666666",
  "qwertyuiop", "123321", "mustang", "1234567890", "michael",
  "654321", "pussy", "superman", "1qaz2wsx", "7777777",
  "fuckyou", "121212", "000000", "qazwsx", "123qwe",
  "killer", "trustno1", "jordan", "jennifer", "zxcvbnm",
  "asdfgh", "hunter", "buster", "soccer", "harley",
  "batman", "andrew", "tigger", "sunshine", "iloveyou",
  "fuckme", "2000", "charlie", "robert", "thomas",
  "hockey", "ranger", "daniel", "starwars", "klaster",
  "112233", "george", "asshole", "computer", "michelle",
  "jessica", "pepper", "1111", "zxcvbn", "555555",
  "11111111", "131313", "freedom", "777777", "pass",
  "fuck", "maggie", "159753", "aaaaaa", "ginger",
  "princess", "joshua", "cheese", "amanda", "summer",
  "love", "ashley", "6969", "nicole", "chelsea",
  "biteme", "matthew", "access", "yankees", "987654321",
  "dallas", "austin", "thunder", "taylor", "matrix",
  "senha", "senha123", "abc123456", "brasil", "123mudar",
  "admin", "administrator", "welcome", "welcome1", "password1",
  "password123", "admin123", "root", "toor", "pass123",
  "test", "test123", "guest", "guest123", "changeme"
];

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number; // 0-5 força da senha
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    notCommon: boolean;
  };
}

/**
 * Valida a força de uma senha
 * Requisitos mínimos:
 * - 12 caracteres
 * - 1 letra maiúscula
 * - 1 letra minúscula
 * - 1 número
 * - 1 caractere especial
 * - Não pode ser uma senha comum
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  
  const requirements = {
    minLength: password.length >= 12,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
    notCommon: !isCommonPassword(password),
  };
  
  if (!requirements.minLength) {
    errors.push("A senha deve ter no mínimo 12 caracteres");
  }
  
  if (!requirements.hasUppercase) {
    errors.push("A senha deve conter pelo menos uma letra maiúscula");
  }
  
  if (!requirements.hasLowercase) {
    errors.push("A senha deve conter pelo menos uma letra minúscula");
  }
  
  if (!requirements.hasNumber) {
    errors.push("A senha deve conter pelo menos um número");
  }
  
  if (!requirements.hasSpecialChar) {
    errors.push("A senha deve conter pelo menos um caractere especial (!@#$%^&*...)");
  }
  
  if (!requirements.notCommon) {
    errors.push("Esta senha é muito comum. Escolha uma senha mais segura");
  }
  
  // Calcular score (0-5)
  const score = Object.values(requirements).filter(Boolean).length;
  
  return {
    isValid: errors.length === 0,
    errors,
    score,
    requirements,
  };
}

/**
 * Verifica se a senha está na lista de senhas comuns
 */
export function isCommonPassword(password: string): boolean {
  const lowerPassword = password.toLowerCase();
  
  // Verificar na lista de senhas comuns
  if (COMMON_PASSWORDS.includes(lowerPassword)) {
    return true;
  }
  
  // Verificar padrões comuns
  const commonPatterns = [
    /^(.)\1+$/, // Repetição de um único caractere (aaaaaa)
    /^(?:abc|123|qwe|asd|zxc)+/, // Sequências de teclado
    /^(?:0123|1234|2345|3456|4567|5678|6789|7890)+/, // Sequências numéricas
    /^(?:abcd|bcde|cdef|defg|efgh|fghi|ghij)+/i, // Sequências alfabéticas
  ];
  
  for (const pattern of commonPatterns) {
    if (pattern.test(lowerPassword)) {
      return true;
    }
  }
  
  // Verificar se contém informações pessoais comuns (placeholders)
  const personalPatterns = [
    /password/i,
    /senha/i,
    /admin/i,
    /user/i,
    /login/i,
    /welcome/i,
    /test/i,
  ];
  
  for (const pattern of personalPatterns) {
    if (pattern.test(lowerPassword)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Retorna uma descrição da força da senha
 */
export function getPasswordStrengthLabel(score: number): {
  label: string;
  color: string;
} {
  if (score <= 1) {
    return { label: "Muito fraca", color: "text-destructive" };
  }
  if (score <= 2) {
    return { label: "Fraca", color: "text-orange-500" };
  }
  if (score <= 3) {
    return { label: "Razoável", color: "text-yellow-500" };
  }
  if (score <= 4) {
    return { label: "Boa", color: "text-blue-500" };
  }
  return { label: "Excelente", color: "text-green-500" };
}

/**
 * Gera uma senha segura aleatória
 */
export function generateSecurePassword(length: number = 16): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  
  const allChars = uppercase + lowercase + numbers + special;
  
  // Garantir pelo menos um de cada tipo
  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Completar com caracteres aleatórios
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Embaralhar a senha
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}
