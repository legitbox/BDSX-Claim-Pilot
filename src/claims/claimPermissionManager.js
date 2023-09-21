"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPermData = exports.getClaimPermissionDatas = exports.updatePermissions = exports.registerPermission = exports.createDefaultClaimPermission = exports.ClaimPermissionData = void 0;
const ClaimPermissionDatas = new Map();
class ClaimPermissionData {
    constructor(permissionName, defaultValue, optionName, onlyCoOwner) {
        this.permissionName = permissionName;
        this.defaultValue = defaultValue;
        this.optionName = optionName;
        this.onlyCoOwner = onlyCoOwner;
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
function registerPermission(permissionName, defaultValue, optionName, onlyCoOwner) {
    const permData = new ClaimPermissionData(permissionName, defaultValue, optionName, onlyCoOwner);
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
registerPermission("edit_name", false, "Can Edit Claim Name", false);
registerPermission("edit_members", false, "Can Edit Members", true);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1QZXJtaXNzaW9uTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsYWltUGVybWlzc2lvbk1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsTUFBTSxvQkFBb0IsR0FBcUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUl6RSxNQUFhLG1CQUFtQjtJQU01QixZQUFZLGNBQXNCLEVBQUUsWUFBcUIsRUFBRSxVQUFrQixFQUFFLFdBQW9CO1FBQy9GLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBQzdCLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO0lBQ25DLENBQUM7Q0FDSjtBQVpELGtEQVlDO0FBRUQsU0FBZ0IsNEJBQTRCO0lBQ3hDLE1BQU0sV0FBVyxHQUFvQixJQUFJLEdBQUcsRUFBRSxDQUFDO0lBRS9DLEtBQUssTUFBTSxVQUFVLElBQUksb0JBQW9CLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFDcEQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztLQUN2RTtJQUVELE9BQU8sV0FBVyxDQUFDO0FBQ3ZCLENBQUM7QUFSRCxvRUFRQztBQUVELFNBQWdCLGtCQUFrQixDQUFDLGNBQXNCLEVBQUUsWUFBcUIsRUFBRSxVQUFrQixFQUFFLFdBQW9CO0lBQ3RILE1BQU0sUUFBUSxHQUFHLElBQUksbUJBQW1CLENBQUMsY0FBYyxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFFaEcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUN2RCxDQUFDO0FBSkQsZ0RBSUM7QUFFRCxTQUFnQixpQkFBaUIsQ0FBQyxXQUE0QjtJQUMxRCxNQUFNLHFCQUFxQixHQUFhLEVBQUUsQ0FBQztJQUMzQyxLQUFLLE1BQU0sUUFBUSxJQUFJLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxFQUFFO1FBQ2xELHFCQUFxQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFcEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFO1lBQzNDLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDbkU7S0FDSjtJQUVELGtEQUFrRDtJQUNsRCxLQUFLLE1BQU0sU0FBUyxJQUFJLFdBQVcsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUN4QyxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQzVDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDakM7S0FDSjtBQUNMLENBQUM7QUFoQkQsOENBZ0JDO0FBRUQsU0FBZ0IsdUJBQXVCO0lBQ25DLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQ3JELENBQUM7QUFGRCwwREFFQztBQUVELFNBQWdCLFdBQVcsQ0FBQyxVQUFrQjtJQUMxQyxPQUFPLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNoRCxDQUFDO0FBRkQsa0NBRUM7QUFFRCw0Q0FBNEM7QUFDNUMsa0JBQWtCLENBQUMsV0FBVyxFQUFFLEtBQUssRUFBRSxxQkFBcUIsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUNyRSxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLElBQUksQ0FBQyxDQUFDIn0=