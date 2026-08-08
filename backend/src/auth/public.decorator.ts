import { SetMetadata } from '@nestjs/common';

// Oznacza endpoint jako dostępny bez sesji JWT (np. logowanie, health-check,
// logowanie RFID na terminalu hali, gdzie fizyczna karta + PIN są czynnikiem uwierzytelniającym).
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
