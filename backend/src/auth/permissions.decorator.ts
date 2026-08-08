import { SetMetadata } from '@nestjs/common';
import type { Permission } from './permissions.constants';

export const PERMISSIONS_KEY = 'permissions';

// Następca @Roles(). Kontroler deklaruje, CZEGO wymaga operacja, a nie KTO ma
// do niej prawo — kto, decyduje konfiguracja ról w bazie. Dzięki temu klient
// może stworzyć rolę "Planista" z orders.create bez zmiany linijki kodu.
//
// Podanie kilku uprawnień znaczy "wystarczy dowolne z nich".
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
