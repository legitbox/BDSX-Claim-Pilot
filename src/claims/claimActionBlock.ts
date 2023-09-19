import {events} from "bdsx/event";
import {getClaimAtPos} from "./claim";
import {CommandPermissionLevel} from "bdsx/bds/command";
import {CANCEL, VectorXYZ} from "bdsx/common";
import {ServerPlayer} from "bdsx/bds/player";
import {procHacker} from "bdsx/prochacker";
import {bool_t, int32_t, uint8_t, void_t} from "bdsx/nativetype";
import {Block, BlockSource} from "bdsx/bds/block";
import {BlockPos, Vec3} from "bdsx/bds/blockpos";
import {Actor} from "bdsx/bds/actor";
import {ItemStack} from "bdsx/bds/inventory";
import {nativeClass, NativeClass, nativeField} from "bdsx/nativeclass";
import {isPointInBox} from "../utils";

events.blockDestroy.on((ev) => {
    if (!checkCanInteractWithBlock(ev.player, ev.blockPos)) {
        return CANCEL;
    }
})

events.blockPlace.on((ev) => {
    if (!checkCanInteractWithBlock(ev.player, ev.blockPos)) {
        return CANCEL;
    }
})

events.blockInteractedWith.on((ev) => {
    if (!checkCanInteractWithBlock(ev.player, ev.blockPos)) {
        return CANCEL;
    }
})

events.itemUse.on((ev) => {
    return handleItemUseClaimCheck(ev.player);
})

events.itemUseOnBlock.on((ev) => {
    if (!ev.actor.isPlayer()) {
        return ;
    }

    if (!checkCanInteractWithBlock(ev.actor, ev)) {
        return CANCEL;
    }
})

events.playerAttack.on((ev) => {
    if (!checkCanInteractWithTarget(ev.player, ev.victim)) {
        return CANCEL;
    }
})

events.playerInteract.on((ev) => {
    if (!checkCanInteractWithTarget(ev.player, ev.victim)) {
        return CANCEL;
    }
})

events.entityStartRiding.on((ev) => {
    if (!ev.entity.isPlayer()) {
        return;
    }

    if (!checkCanInteractWithTarget(ev.entity, ev.ride)) {
        return CANCEL;
    }
})

function handleItemUseClaimCheck(player: ServerPlayer) {
    if (!checkCanInteractWithBlock(player, player.getPosition())) {
        return CANCEL;
    }
}

events.farmlandDecay.on((ev) => {
    if (!ev.culprit.isPlayer()) {
        return;
    }

    if (!checkCanInteractWithBlock(ev.culprit, ev.blockPos)) {
        return CANCEL;
    }
})

const grassBlock$tryToTill = procHacker.hooking(
    '?tryToTill@GrassBlock@@UEBA_NAEAVBlockSource@@AEBVBlockPos@@AEAVActor@@AEAVItemStack@@@Z',
    bool_t,
    {this: Block},
    BlockSource,
    BlockPos,
    Actor,
    ItemStack,
)(onTryTill);

function onTryTill(this: Block, region: BlockSource, pos: BlockPos, tiller: Actor, item: ItemStack) {
    if (!tiller.isPlayer()) {
        return grassBlock$tryToTill.call(this, region, pos, tiller, item);
    }

    if (checkCanInteractWithBlock(tiller, pos)) {
        return grassBlock$tryToTill.call(this, region, pos, tiller, item);
    } else {
        return false;
    }
}


class BucketItem extends NativeClass {}

@nativeClass()
class InteractionResult extends NativeClass {
    @nativeField(int32_t)
    value:int32_t;
}

let _bucketItem_useOn = procHacker.hooking(
    "?_useOn@BucketItem@@EEBA?AVInteractionResult@@AEAVItemStack@@AEAVActor@@VBlockPos@@EAEBVVec3@@@Z",
    InteractionResult,
    {this: BucketItem},
    InteractionResult,
    ItemStack,
    Actor,
    BlockPos,
    uint8_t,
    Vec3
)(onUseBucket)

function onUseBucket(this: BucketItem, res: InteractionResult, item: ItemStack, actor: Actor, pos: BlockPos, side: uint8_t, uVec3: Vec3) {
    if (!actor.isPlayer()) {
        return _bucketItem_useOn.call(this, res, item, actor, pos, side, uVec3);
    }

    if (checkCanInteractWithBlock(actor, pos)) {
        return _bucketItem_useOn.call(this, res, item, actor, pos, side, uVec3);
    } else {
        const falseResult = InteractionResult.allocate();
        falseResult.value = 0;
        return falseResult;
    }
}

const block$use = procHacker.hooking(
    '?use@Block@@QEBA_NAEAVPlayer@@AEBVBlockPos@@EV?$optional@VVec3@@@std@@@Z',
    bool_t,
    {this: Block},
    ServerPlayer,
    BlockPos,
    uint8_t,
)(onUseRepeater);

function onUseRepeater(this: Block, player: ServerPlayer, pos: BlockPos, side: uint8_t) {
    if (checkCanInteractWithBlock(player, pos)) {
        return block$use.call(this, player, pos, side);
    } else {
        return false;
    }
}

const itemFrameBlock$attack = procHacker.hooking(
    '?attack@ItemFrameBlock@@UEBA_NPEAVPlayer@@AEBVBlockPos@@@Z',
    bool_t,
    {this: Block},
    ServerPlayer,
    BlockPos,
)(onItemFrameAttack);

function onItemFrameAttack(this: Block, player: ServerPlayer, pos: BlockPos) {
    if (checkCanInteractWithBlock(player, pos)) {
        return itemFrameBlock$attack.call(this, player, pos);
    } else {
        return false;
    }
}

const basePressurePlate$checkPressed = procHacker.hooking(
    '?checkPressed@BasePressurePlateBlock@@IEBAXAEAVBlockSource@@AEBVBlockPos@@PEAVActor@@HH@Z',
    void_t,
    {this: Block},
    BlockSource,
    BlockPos,
    Actor,
    int32_t,
    int32_t,
)(onCheckPressed);

function onCheckPressed(this: Block, region: BlockSource, pos: BlockPos, presser: Actor, uNum1: number, uNum2: number) {
    if (presser === null || !presser.isPlayer()) {
        return basePressurePlate$checkPressed.call(this, region, pos, presser, uNum1, uNum2);
    }

    if (checkCanInteractWithBlock(presser, pos)) {
        return basePressurePlate$checkPressed.call(this, region, pos, presser, uNum1, uNum2);
    } else {
        return;
    }
}

const liquidBlockDynamic$canSpreadTo = procHacker.hooking(
    '?_canSpreadTo@LiquidBlockDynamic@@AEBA_NAEAVBlockSource@@AEBVBlockPos@@1E@Z',
    bool_t,
    {this: Block},
    BlockSource,
    BlockPos,
    BlockPos,
    uint8_t,
)(onRequestCanFlow);

function onRequestCanFlow(this: Block, region: BlockSource, target: BlockPos, source: BlockPos, side: number) {
    const claim = getClaimAtPos(target, region.getDimensionId());
    if (claim === undefined) {
        return liquidBlockDynamic$canSpreadTo.call(this, region, target, source, side);
    }

    if (isPointInBox(source, claim.cornerOne, claim.cornerEight)) {
        return liquidBlockDynamic$canSpreadTo.call(this, region, target, source, side);
    } else {
        return false;
    }
}

function checkCanInteractWithBlock(player: ServerPlayer, pos: VectorXYZ, _checkedPermission?: string) {
    const claim = getClaimAtPos(pos, player.getDimensionId());
    if (claim === undefined) {
        return true;
    }

    const xuid = player.getXuid();
    const claimMembers = claim.getMemberXuids();

    return !(claim.owner !== xuid && !claimMembers.includes(xuid) && player.getCommandPermissionLevel() === CommandPermissionLevel.Normal);
}

function checkCanInteractWithTarget(player: ServerPlayer, target: Actor, _checkedPermission?: string) {
    const claim = getClaimAtPos(target.getPosition(), target.getDimensionId());
    if (claim === undefined) {
        return true;
    }

    const xuid = player.getXuid();
    const claimMembers = claim.getMemberXuids();
    return !(claim.owner !== xuid && !claimMembers.includes(xuid) && player.getCommandPermissionLevel() === CommandPermissionLevel.Normal);
}
