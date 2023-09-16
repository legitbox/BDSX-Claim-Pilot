"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPermData = exports.getClaimPermissionDatas = exports.updatePermissions = exports.registerPermission = exports.createDefaultClaimPermission = exports.ClaimPermissionData = void 0;
const ClaimPermissionDatas = new Map();
class ClaimPermissionData {
    constructor(permissionName, defaultValue, optionName) {
        this.permissionName = permissionName;
        this.defaultValue = defaultValue;
        this.optionName = optionName;
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
function registerPermission(permissionName, defaultValue, optionName) {
    const permData = new ClaimPermissionData(permissionName, defaultValue, optionName);
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
function getClaimPermissionDatas() {
    return Array.from(ClaimPermissionDatas.values());
}
exports.getClaimPermissionDatas = getClaimPermissionDatas;
function getPermData(permission) {
    return ClaimPermissionDatas.get(permission);
}
exports.getPermData = getPermData;
// Area for registering built in permissions
registerPermission("edit_name", false, "Can Edit Claim Name");
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1QZXJtaXNzaW9uTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsYWltUGVybWlzc2lvbk1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsTUFBTSxvQkFBb0IsR0FBcUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUl6RSxNQUFhLG1CQUFtQjtJQUs1QixZQUFZLGNBQXNCLEVBQUUsWUFBcUIsRUFBRSxVQUFrQjtRQUN6RSxJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQztRQUNyQyxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztRQUNqQyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztJQUNqQyxDQUFDO0NBQ0o7QUFWRCxrREFVQztBQUVELFNBQWdCLDRCQUE0QjtJQUN4QyxNQUFNLFdBQVcsR0FBb0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUUvQyxLQUFLLE1BQU0sVUFBVSxJQUFJLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxFQUFFO1FBQ3BELFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBRSxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUM7S0FDdkU7SUFFRCxPQUFPLFdBQVcsQ0FBQztBQUN2QixDQUFDO0FBUkQsb0VBUUM7QUFFRCxTQUFnQixrQkFBa0IsQ0FBQyxjQUFzQixFQUFFLFlBQXFCLEVBQUUsVUFBa0I7SUFDaEcsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxjQUFjLEVBQUUsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBRW5GLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDdkQsQ0FBQztBQUpELGdEQUlDO0FBRUQsU0FBZ0IsaUJBQWlCLENBQUMsV0FBNEI7SUFDMUQsTUFBTSxxQkFBcUIsR0FBYSxFQUFFLENBQUM7SUFDM0MsS0FBSyxNQUFNLFFBQVEsSUFBSSxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsRUFBRTtRQUNsRCxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRXBELElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsRUFBRTtZQUMzQyxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO1NBQ25FO0tBQ0o7SUFFRCxrREFBa0Q7SUFDbEQsS0FBSyxNQUFNLFNBQVMsSUFBSSxXQUFXLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDeEMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUM1QyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQ2pDO0tBQ0o7QUFDTCxDQUFDO0FBaEJELDhDQWdCQztBQUVELFNBQWdCLHVCQUF1QjtJQUNuQyxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUNyRCxDQUFDO0FBRkQsMERBRUM7QUFFRCxTQUFnQixXQUFXLENBQUMsVUFBa0I7SUFDMUMsT0FBTyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDaEQsQ0FBQztBQUZELGtDQUVDO0FBRUQsNENBQTRDO0FBQzVDLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUscUJBQXFCLENBQUMsQ0FBQyJ9