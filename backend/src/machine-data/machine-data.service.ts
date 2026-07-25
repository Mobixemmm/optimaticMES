import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MachineData } from '../entities/machine-data.entity';

@Injectable()
export class MachineDataService {
    constructor(
        @InjectRepository(MachineData)
        private machineDataRepository: Repository<MachineData>,
    ) {}

    async findLatest(machineId?: string, limit: number = 100): Promise<MachineData[]> {
        const query = this.machineDataRepository.createQueryBuilder('md')
            .orderBy('md.time', 'DESC')
            .take(limit);

        if (machineId) {
            query.where('md.machine_id = :machineId', { machineId });
        }

        return query.getMany();
    }

    async findByTag(machineId: string, tagName: string, limit: number = 100): Promise<MachineData[]> {
        return this.machineDataRepository.find({
            where: { machine_id: machineId, tag_name: tagName },
            order: { time: 'DESC' },
            take: limit,
        });
    }

    async getMachines(): Promise<string[]> {
        const result = await this.machineDataRepository
            .createQueryBuilder('md')
            .select('DISTINCT md.machine_id', 'machine_id')
            .getRawMany();
        
        return result.map(r => r.machine_id);
    }

    async getTags(machineId: string): Promise<string[]> {
        const result = await this.machineDataRepository
            .createQueryBuilder('md')
            .select('DISTINCT md.tag_name', 'tag_name')
            .where('md.machine_id = :machineId', { machineId })
            .getRawMany();
        
        return result.map(r => r.tag_name);
    }

    async getLatestValues(machineId: string): Promise<Record<string, any>> {
        const latest = await this.machineDataRepository
            .createQueryBuilder('md')
            .distinctOn(['md.tag_name'])
            .where('md.machine_id = :machineId', { machineId })
            .orderBy('md.tag_name', 'ASC')
            .addOrderBy('md.time', 'DESC')
            .getMany();

        const result: Record<string, any> = {};
        for (const row of latest) {
            result[row.tag_name] = {
                value: row.value_num ?? row.value_bool ?? row.value_text,
                time: row.time,
            };
        }
        return result;
    }
}