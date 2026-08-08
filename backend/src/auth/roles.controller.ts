import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RequirePermission } from './permissions.decorator';
import { PERMISSIONS, PERMISSION_GROUPS } from './permissions.constants';

@ApiTags('Role i uprawnienia')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // Katalog uprawnień dla panelu admina — pogrupowany, żeby dało się z niego
  // od razu zbudować listę checkboxów przy edycji roli.
  @Get('catalog')
  @RequirePermission(PERMISSIONS.ROLES_READ)
  @ApiOperation({ summary: 'Dostępne uprawnienia pogrupowane tematycznie' })
  catalog() {
    return PERMISSION_GROUPS;
  }

  @Get()
  @RequirePermission(PERMISSIONS.ROLES_READ)
  @ApiOperation({ summary: 'Lista ról klienta' })
  list() {
    return this.rolesService.list();
  }

  @Post()
  @RequirePermission(PERMISSIONS.ROLES_WRITE)
  @ApiOperation({ summary: 'Utwórz rolę' })
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.ROLES_WRITE)
  @ApiOperation({ summary: 'Zmień nazwę, uprawnienia lub zasięg roli' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.ROLES_WRITE)
  @ApiOperation({ summary: 'Usuń rolę (tylko niesystemową i nieużywaną)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.rolesService.remove(id);
    return { success: true };
  }
}
