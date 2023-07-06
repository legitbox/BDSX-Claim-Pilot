"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePermissions = exports.registerPermission = exports.createDefaultClaimPermission = exports.ClaimPermissionData = void 0;
const ClaimPermissionDatas = new Map();
class ClaimPermissionData {
    constructor(permissionName, defaultValue) {
        this.permissionName = permissionName;
        this.defaultValue = defaultValue;
    }
}
exports.ClaimPermissionData = ClaimPermissionData;
function createDefaultClaimPermission() {
    const permissions = new Map();
    for (const permission of ClaimPermissionDatas.values()) {
        permissions.set(permission.permissionName, permission.defaultValue);
    }
    return permissions;
}
exports.createDefaultClaimPermission = createDefaultClaimPermission;
function registerPermission(permissionName, defaultValue) {
    const permData = new ClaimPermissionData(permissionName, defaultValue);
    ClaimPermissionDatas.set(permissionName, permData);
}
exports.registerPermission = registerPermission;
function updatePermissions(permissions) {
    const registeredPermissions = [];
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
exports.updatePermissions = updatePermissions;
// Area for registering built in permissions
registerPermission("edit_members", false);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1QZXJtaXNzaW9uTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsYWltUGVybWlzc2lvbk1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsTUFBTSxvQkFBb0IsR0FBcUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUl6RSxNQUFhLG1CQUFtQjtJQUk1QixZQUFZLGNBQXNCLEVBQUUsWUFBcUI7UUFDckQsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7UUFDckMsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7SUFDckMsQ0FBQztDQUNKO0FBUkQsa0RBUUM7QUFFRCxTQUFnQiw0QkFBNEI7SUFDeEMsTUFBTSxXQUFXLEdBQW9CLElBQUksR0FBRyxFQUFFLENBQUM7SUFFL0MsS0FBSyxNQUFNLFVBQVUsSUFBSSxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsRUFBRTtRQUNwRCxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDO0tBQ3ZFO0lBRUQsT0FBTyxXQUFXLENBQUM7QUFDdkIsQ0FBQztBQVJELG9FQVFDO0FBRUQsU0FBZ0Isa0JBQWtCLENBQUMsY0FBc0IsRUFBRSxZQUFxQjtJQUM1RSxNQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFtQixDQUFDLGNBQWMsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUV2RSxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQ3ZELENBQUM7QUFKRCxnREFJQztBQUVELFNBQWdCLGlCQUFpQixDQUFDLFdBQTRCO0lBQzFELE1BQU0scUJBQXFCLEdBQWEsRUFBRSxDQUFDO0lBQzNDLEtBQUssTUFBTSxRQUFRLElBQUksb0JBQW9CLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFDbEQscUJBQXFCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUVwRCxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLEVBQUU7WUFDM0MsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUNuRTtLQUNKO0lBRUQsa0RBQWtEO0lBQ2xELEtBQUssTUFBTSxTQUFTLElBQUksV0FBVyxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ3hDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDNUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUNqQztLQUNKO0FBQ0wsQ0FBQztBQWhCRCw4Q0FnQkM7QUFFRCw0Q0FBNEM7QUFDNUMsa0JBQWtCLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFDIn0=