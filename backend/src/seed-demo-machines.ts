import { INestApplicationContext } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Machine } from './entities/machine.entity';

/**
 * Rejestruje maszyny demo, zanim seed zapisze dla nich jakiekolwiek zdarzenia.
 *
 * Odkąd przestoje i alerty Andon mają klucz obcy do `machines` (migracja
 * MachineForeignKeys), seed zapisujący zdarzenie dla niezarejestrowanej maszyny
 * po prostu padnie. Wcześniej przechodził i zostawiał w bazie sieroty, których
 * analityka i tak nie widziała — liczy stan maszyn po liście z `machines`.
 *
 * Maszyny z telemetrii zakłada MachinesService.syncFromTelemetry(); te nazwane
 * (CNC-01 Mazak, Robot RB-07…) nie mają swojego gatewaya, więc muszą powstać tu.
 */
export async function ensureDemoMachines(
  app: INestApplicationContext,
  machineIds: string[],
): Promise<void> {
  const machineRepo = app.get<Repository<Machine>>(getRepositoryToken(Machine));

  let created = 0;
  for (const machineId of [...new Set(machineIds)]) {
    // tenant_id zostawiamy bazie — seedy działają poza kontekstem żądania,
    // a kolumna ma DEFAULT 1 (tenant demo), tak samo jak reszta seedowanych encji.
    const exists = await machineRepo.findOne({ where: { machineId } });
    if (exists) continue;
    await machineRepo.save(
      machineRepo.create({ machineId, name: machineId, isActive: true }),
    );
    created++;
  }

  if (created > 0) {
    console.log(`✅ Zarejestrowano ${created} maszyn demo w tabeli machines`);
  }
}
