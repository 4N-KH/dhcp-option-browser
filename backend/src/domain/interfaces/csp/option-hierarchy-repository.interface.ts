import { DhcpObject } from '@/domain/models/csp/dhcp-object.model';
import { DhcpOption } from '@/domain/models/csp/dhcp-option.model';

/**
 * Injection token for OptionHierarchyRepository
 * (wird im AppModule für Provider-Binding verwendet).
 */
export const OPTION_HIERARCHY_REPOSITORY = Symbol('OptionHierarchyRepository');

/**
 * Interface for all database/API access operations relating to the DHCP object hierarchy and option aggregation.
 * This abstraction ensures the application and service layers remain testable and decoupled from infrastructure concerns.
 */
export interface OptionHierarchyRepository {
  /**
   * Retrieves any object by its type and ID.
   * @param objectType Type of the object (e.g., 'ip-space', 'subnet', etc.)
   * @param id Database or external ID
   */
  getObjectById(
    objectType: string,
    id: number | string,
  ): Promise<DhcpObject | null>;

  /**
   * Returns all direct child objects of a given parent object.
   * @param objectType Type of the parent object
   * @param parentId ID of the parent object
   */
  getChildren(
    objectType: string,
    parentId: number | string,
  ): Promise<DhcpObject[]>;

  /**
   * Retrieves the parent object for a given object (if present).
   * @param objectType Type of the object
   * @param id ID of the object
   */
  getParent(
    objectType: string,
    id: number | string,
  ): Promise<DhcpObject | null>;

  /**
   * Retrieves all DHCP options explicitly set on an object (from the corresponding ..._dhcp_option table).
   * @param objectType Type of the object
   * @param objectId ID of the object
   */
  getExplicitOptions(
    objectType: string,
    objectId: number | string,
  ): Promise<DhcpOption[]>;

  /**
   * Retrieves all assigned option groups for an object (returns names/IDs of the groups).
   * @param objectType Type of the object
   * @param objectId ID of the object
   */
  getAssignedOptionGroups(
    objectType: string,
    objectId: number | string,
  ): Promise<{ groupId: number | string; groupName: string }[]>;

  /**
   * Retrieves all options belonging to a specific option group (returns option details).
   * @param groupId ID of the option group
   */
  getOptionsFromOptionGroup(groupId: number | string): Promise<DhcpOption[]>;

  /**
   * Optionally: Retrieves the global DHCP configuration (if supported).
   */
  getGlobalConfig(): Promise<DhcpObject | null>;

  /**
   * Optionally: Retrieves all options from the global configuration (explicit and via groups).
   */
  getGlobalOptions(): Promise<DhcpOption[]>;

  // Methods can be added modularly as required by the product.
}
