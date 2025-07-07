import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CspDhcpHierarchyService } from '@/application/services/option-hierarchy/csp/dhcp-hierarchy.service';
import {
  GlobalDhcpConfigTreeDto,
  IpSpaceTreeDto,
  AddressBlockTreeDto,
  SubnetTreeDto,
} from '@/domain/dto/csp/dhcp-tree.dto';

/**
 * Controller für die Bereitstellung der hierarchischen DHCP-Strukturen im CSP-Modell.
 */
@Controller('api/csp/hierarchy')
export class CspDhcpHierarchyController {
  constructor(private readonly hierarchyService: CspDhcpHierarchyService) {}

  /**
   * Gibt die komplette DHCP-Hierarchie des Grids zurück.
   */
  @Get('full')
  async getFullHierarchy(): Promise<GlobalDhcpConfigTreeDto> {
    return this.hierarchyService.getFullDhcpHierarchy();
  }

  /**
   * Gibt die komplette DHCP-Hierarchie für einen bestimmten IP Space zurück.
   */
  @Get('ip-space/:ipSpaceId')
  async getIpSpaceHierarchy(
    @Param('ipSpaceId', ParseIntPipe) ipSpaceId: number,
  ): Promise<IpSpaceTreeDto> {
    const result = await this.hierarchyService.getIpSpaceHierarchy(ipSpaceId);
    if (!result)
      throw new HttpException('IP Space not found', HttpStatus.NOT_FOUND);
    return result;
  }

  /**
   * Gibt die komplette DHCP-Hierarchie für einen bestimmten Address Block zurück.
   */
  @Get('address-block/:blockId')
  async getAddressBlockHierarchy(
    @Param('blockId', ParseIntPipe) blockId: number,
  ): Promise<AddressBlockTreeDto> {
    const result =
      await this.hierarchyService.getAddressBlockHierarchy(blockId);
    if (!result)
      throw new HttpException('Address Block not found', HttpStatus.NOT_FOUND);
    return result;
  }

  /**
   * Gibt die komplette DHCP-Hierarchie für ein einzelnes Subnetz zurück.
   */
  @Get('subnet/:subnetId')
  async getSubnetHierarchy(
    @Param('subnetId', ParseIntPipe) subnetId: number,
  ): Promise<SubnetTreeDto> {
    const result = await this.hierarchyService.getSubnetTree(subnetId);
    if (!result)
      throw new HttpException('Subnet not found', HttpStatus.NOT_FOUND);
    return result;
  }
}
