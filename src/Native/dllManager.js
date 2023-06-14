"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSetBlockHookEnabled = exports.updateConfigInNative = exports.updateStorageInNative = void 0;
const dll_1 = require("bdsx/dll");
const nativetype_1 = require("bdsx/nativetype");
const dllTypes_1 = require("./dllTypes");
const pdbcache_1 = require("bdsx/pdbcache");
const event_1 = require("bdsx/event");
const untoastedDll = dll_1.NativeModule.load(__dirname + '\\bdsx-claim-pilot-untoasted.dll');
const init = untoastedDll.getFunction('init', nativetype_1.void_t, null, nativetype_1.int32_t, // BSSetBlockOffset
nativetype_1.int32_t, // FBTickOffset
nativetype_1.int32_t, // BGetNameOffset
nativetype_1.int32_t);
exports.updateStorageInNative = untoastedDll.getFunction('updateStorage', nativetype_1.void_t, null, dllTypes_1.NativeStorageObject);
exports.updateConfigInNative = untoastedDll.getFunction('updateConfig', nativetype_1.void_t, null, dllTypes_1.NativeConfigObject);
exports.setSetBlockHookEnabled = untoastedDll.getFunction('setSetBlockHookEnabled', nativetype_1.void_t, null, nativetype_1.bool_t);
event_1.events.serverOpen.on(() => {
    init(pdbcache_1.pdbcache.search('?setBlock@BlockSource@@UEAA_NAEBVBlockPos@@AEBVBlock@@HPEBUActorBlockSyncMessage@@PEAVActor@@@Z'), pdbcache_1.pdbcache.search('?tick@FireBlock@@UEBAXAEAVBlockSource@@AEBVBlockPos@@AEAVRandom@@@Z'), pdbcache_1.pdbcache.search('?getName@Block@@QEBAAEBVHashedString@@XZ'), pdbcache_1.pdbcache.search('?getDimensionId@BlockSource@@UEBA?AV?$AutomaticID@VDimension@@H@@XZ'));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGxsTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRsbE1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsa0NBQXNDO0FBQ3RDLGdEQUF3RDtBQUN4RCx5Q0FBbUU7QUFDbkUsNENBQXVDO0FBQ3ZDLHNDQUFrQztBQUVsQyxNQUFNLFlBQVksR0FBRyxrQkFBWSxDQUFDLElBQUksQ0FDbEMsU0FBUyxHQUFHLGtDQUFrQyxDQUNqRCxDQUFDO0FBRUYsTUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FDakMsTUFBTSxFQUNOLG1CQUFNLEVBQ04sSUFBSSxFQUNKLG9CQUFPLEVBQUUsbUJBQW1CO0FBQzVCLG9CQUFPLEVBQUUsZUFBZTtBQUN4QixvQkFBTyxFQUFFLGlCQUFpQjtBQUMxQixvQkFBTyxDQUNWLENBQUM7QUFFVyxRQUFBLHFCQUFxQixHQUFHLFlBQVksQ0FBQyxXQUFXLENBQ3pELGVBQWUsRUFDZixtQkFBTSxFQUNOLElBQUksRUFDSiw4QkFBbUIsQ0FDdEIsQ0FBQTtBQUVZLFFBQUEsb0JBQW9CLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FDeEQsY0FBYyxFQUNkLG1CQUFNLEVBQ04sSUFBSSxFQUNKLDZCQUFrQixDQUNyQixDQUFBO0FBRVksUUFBQSxzQkFBc0IsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUMxRCx3QkFBd0IsRUFDeEIsbUJBQU0sRUFDTixJQUFJLEVBQ0osbUJBQU0sQ0FDVCxDQUFBO0FBRUQsY0FBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFO0lBQ3RCLElBQUksQ0FDQSxtQkFBUSxDQUFDLE1BQU0sQ0FBQyxpR0FBaUcsQ0FBQyxFQUNsSCxtQkFBUSxDQUFDLE1BQU0sQ0FBQyxxRUFBcUUsQ0FBQyxFQUN0RixtQkFBUSxDQUFDLE1BQU0sQ0FBQywwQ0FBMEMsQ0FBQyxFQUMzRCxtQkFBUSxDQUFDLE1BQU0sQ0FBQyxxRUFBcUUsQ0FBQyxDQUN6RixDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUEifQ==