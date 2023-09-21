const ClaimPermissionDatas: Map<string, ClaimPermissionData> = new Map();

export type ClaimPermission = Map<string, boolean>;

export class ClaimPermissionData {
    permissionName: string;
    defaultValue: boolean;
    optionName: string;
    onlyCoOwner: boolean;

    constructor(permissionName: string, defaultValue: boolean, optionName: string, onlyCoOwner: boolean) {
        this.permissionName = permissionName;
        this.defaultValue = defaultValue;
        this.optionName = optionName;
        this.onlyCoOwner = onlyCoOwner;
    }
}

export function createDefaultClaimPermission(): ClaimPermission {
    const permissions: ClaimPermission = new Map();

    for (const permission of ClaimPermissionDatas.values()) {
        permissions.set(permission.permissionName, permission.defaultValue);
    }

    return permissions;
}

export function registerPermission(permissionName: string, defaultValue: boolean, optionName: string, onlyCoOwner: boolean) {
    const permData = new ClaimPermissionData(permissionName, defaultValue, optionName, onlyCoOwner);

    ClaimPermissionDatas.set(permissionName, permData);
}

export function updatePermissions(permissions: ClaimPermission) {
    const registeredPermissions: string[] = [];
    for (const permData of ClaimPermissionDatas.values()) {
        registeredPermissions.push(permData.permissionName);

        if (!permissions.has(permData.permissionName)) {
            permissions.set(permData.permissionName, permData.defaultValue);
        }
    }

    // Removing permissions that didn't get registered
    for (const storedKey of permissions.keys()) {
        if (!registeredPermissions.includes(storedKey)) {
            permissions.delete(storedKey);
        }
    }
}

export function getClaimPermissionDatas(): ClaimPermissionData[] {
    return Array.from(ClaimPermissionDatas.values());
}

export function getPermData(permission: string) {
    return ClaimPermissionDatas.get(permission);
}

// Area for registering built in permissions
registerPermission("edit_name", false, "Can Edit Claim Name", false);
registerPermission("edit_members", false, "Can Edit Members", true);