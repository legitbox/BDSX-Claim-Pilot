import {NativeModule} from "bdsx/dll";
import {bool_t, int32_t, void_t} from "bdsx/nativetype";
import {NativeConfigObject, NativeStorageObject} from "./dllTypes";
import {pdbcache} from "bdsx/pdbcache";
import {events} from "bdsx/event";
import {Vec3} from "bdsx/bds/blockpos";

const untoastedDll = NativeModule.load(
    __dirname + '\\bdsx-claim-pilot-untoasted.dll',
);

const init = untoastedDll.getFunction(
    'init',
    void_t,
    null,
    int32_t, // BSSetBlockOffset
    int32_t, // FBTickOffset
    int32_t, // BGetNameOffset
    int32_t, // BSGetDimensionId
);

export const updateStorageInNative = untoastedDll.getFunction(
    'updateStorage',
    void_t,
    null,
    NativeStorageObject,
)

export const updateConfigInNative = untoastedDll.getFunction(
    'updateConfig',
    void_t,
    null,
    NativeConfigObject,
)

export const setSetBlockHookEnabled = untoastedDll.getFunction(
    'setSetBlockHookEnabled',
    void_t,
    null,
    bool_t,
)

export const checkIfBoxOverlapsAnyClaim = untoastedDll.getFunction(
    'checkIfBoxOverlapsAnyClaim',
    bool_t,
    null,
    Vec3,
    Vec3,
    int32_t,
)

events.serverOpen.on(() => {
    init(
        pdbcache.search('?setBlock@BlockSource@@UEAA_NAEBVBlockPos@@AEBVBlock@@HPEBUActorBlockSyncMessage@@PEAVActor@@@Z'),
        pdbcache.search('?tick@FireBlock@@UEBAXAEAVBlockSource@@AEBVBlockPos@@AEAVRandom@@@Z'),
        pdbcache.search('?getName@Block@@QEBAAEBVHashedString@@XZ'),
        pdbcache.search('?getDimensionId@BlockSource@@UEBA?AV?$AutomaticID@VDimension@@H@@XZ'),
    );
})
