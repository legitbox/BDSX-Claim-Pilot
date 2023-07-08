const ClaimPermissionDatas: Map<string, ClaimPermissionData> = new Map();

export type ClaimPermission = Map<string, boolean>;

export class ClaimPermissionData {
    permissionName: string;
    defaultValue: boolean;

    constructor(permissionName: string, defaultValue: boolean) {
        this.permissionName = permissionName;
        this.defaultValue = defaultValue;
    }
}

export function createDefaultClaimPermission(): ClaimPermission {
    const permissions: ClaimPermission = new Map();

    for (const permission of ClaimPermissionDatas.values()) {
        permissions.set(permission.permissionName, permission.defaultValue);
    }

    return permissions;
}

export function registerPermission(permissionName: string, defaultValue: boolean) {
    const permData = new ClaimPermissionData(permissionName, defaultValue);

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

// Area for registering built in permissions
registerPermission("edit_members", false);
registerPermission("edit_name", false);