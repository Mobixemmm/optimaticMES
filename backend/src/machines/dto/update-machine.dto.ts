import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateMachineDto } from './create-machine.dto';

// machineId jest kluczem powiązania z telemetrią — nie edytujemy go po utworzeniu.
export class UpdateMachineDto extends PartialType(
  OmitType(CreateMachineDto, ['machineId'] as const),
) {}
