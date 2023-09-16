"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIfBoxOverlapsAnyClaim = exports.setSetBlockHookEnabled = exports.updateConfigInNative = exports.updateStorageInNative = void 0;
const dll_1 = require("bdsx/dll");
const nativetype_1 = require("bdsx/nativetype");
const dllTypes_1 = require("./dllTypes");
const pdbcache_1 = require("bdsx/pdbcache");
const event_1 = require("bdsx/event");
const blockpos_1 = require("bdsx/bds/blockpos");
const untoastedDll = dll_1.NativeModule.load(__dirname + '\\bdsx-claim-pilot-untoasted.dll');
const init = untoastedDll.getFunction('init', nativetype_1.void_t, null, nativetype_1.int32_t, // BSSetBlockOffset
nativetype_1.int32_t, // FBTickOffset
nativetype_1.int32_t, // BGetNameOffset
nativetype_1.int32_t);
exports.updateStorageInNative = untoastedDll.getFunction('updateStorage', nativetype_1.void_t, null, dllTypes_1.NativeStorageObject);
exports.updateConfigInNative = untoastedDll.getFunction('updateConfig', nativetype_1.void_t, null, dllTypes_1.NativeConfigObject);
exports.setSetBlockHookEnabled = untoastedDll.getFunction('setSetBlockHookEnabled', nativetype_1.void_t, null, nativetype_1.bool_t);
exports.checkIfBoxOverlapsAnyClaim = untoastedDll.getFunction('checkIfBoxOverlapsAnyClaim', nativetype_1.bool_t, null, blockpos_1.Vec3, blockpos_1.Vec3, nativetype_1.int32_t);
event_1.events.serverOpen.on(() => {
    init(pdbcache_1.pdbcache.search('?setBlock@BlockSource@@UEAA_NAEBVBlockPos@@AEBVBlock@@HPEBUActorBlockSyncMessage@@PEAVActor@@@Z'), pdbcache_1.pdbcache.search('?tick@FireBlock@@UEBAXAEAVBlockSource@@AEBVBlockPos@@AEAVRandom@@@Z'), pdbcache_1.pdbcache.search('?getName@Block@@QEBAAEBVHashedString@@XZ'), pdbcache_1.pdbcache.search('?getDimensionId@BlockSource@@UEBA?AV?$AutomaticID@VDimension@@H@@XZ'));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGxsTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRsbE1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsa0NBQXNDO0FBQ3RDLGdEQUF3RDtBQUN4RCx5Q0FBbUU7QUFDbkUsNENBQXVDO0FBQ3ZDLHNDQUFrQztBQUNsQyxnREFBdUM7QUFFdkMsTUFBTSxZQUFZLEdBQUcsa0JBQVksQ0FBQyxJQUFJLENBQ2xDLFNBQVMsR0FBRyxrQ0FBa0MsQ0FDakQsQ0FBQztBQUVGLE1BQU0sSUFBSSxHQUFHLFlBQVksQ0FBQyxXQUFXLENBQ2pDLE1BQU0sRUFDTixtQkFBTSxFQUNOLElBQUksRUFDSixvQkFBTyxFQUFFLG1CQUFtQjtBQUM1QixvQkFBTyxFQUFFLGVBQWU7QUFDeEIsb0JBQU8sRUFBRSxpQkFBaUI7QUFDMUIsb0JBQU8sQ0FDVixDQUFDO0FBRVcsUUFBQSxxQkFBcUIsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUN6RCxlQUFlLEVBQ2YsbUJBQU0sRUFDTixJQUFJLEVBQ0osOEJBQW1CLENBQ3RCLENBQUE7QUFFWSxRQUFBLG9CQUFvQixHQUFHLFlBQVksQ0FBQyxXQUFXLENBQ3hELGNBQWMsRUFDZCxtQkFBTSxFQUNOLElBQUksRUFDSiw2QkFBa0IsQ0FDckIsQ0FBQTtBQUVZLFFBQUEsc0JBQXNCLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FDMUQsd0JBQXdCLEVBQ3hCLG1CQUFNLEVBQ04sSUFBSSxFQUNKLG1CQUFNLENBQ1QsQ0FBQTtBQUVZLFFBQUEsMEJBQTBCLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FDOUQsNEJBQTRCLEVBQzVCLG1CQUFNLEVBQ04sSUFBSSxFQUNKLGVBQUksRUFDSixlQUFJLEVBQ0osb0JBQU8sQ0FDVixDQUFBO0FBRUQsY0FBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFO0lBQ3RCLElBQUksQ0FDQSxtQkFBUSxDQUFDLE1BQU0sQ0FBQyxpR0FBaUcsQ0FBQyxFQUNsSCxtQkFBUSxDQUFDLE1BQU0sQ0FBQyxxRUFBcUUsQ0FBQyxFQUN0RixtQkFBUSxDQUFDLE1BQU0sQ0FBQywwQ0FBMEMsQ0FBQyxFQUMzRCxtQkFBUSxDQUFDLE1BQU0sQ0FBQyxxRUFBcUUsQ0FBQyxDQUN6RixDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUEifQ==