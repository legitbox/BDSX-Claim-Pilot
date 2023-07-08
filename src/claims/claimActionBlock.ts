import {events} from "bdsx/event";
import {getClaimAtPos} from "./claim";
import {CommandPermissionLevel} from "bdsx/bds/command";
import {CANCEL} from "bdsx/common";
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
    const xuid = ev.player.getXuid();
    const claim = getClaimAtPos(ev.blockPos, ev.player.getDimensionId());

    if (claim === undefined) {
        return;
    }

    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && ev.player.getCommandPermissionLevel() === CommandPermissionLevel.Normal) {
        ev.player.sendMessage('§cYou dont have permission to break blocks in this claim!');
        return CANCEL;
    }
})

events.blockPlace.on((ev) => {
    const xuid = ev.player.getXuid();
    const claim = getClaimAtPos(ev.blockPos, ev.player.getDimensionId());

    if (claim === undefined) {
        return;
    }

    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && ev.player.getCommandPermissionLevel() === CommandPermissionLevel.Normal) {
        ev.player.sendMessage('§cYou dont have permission to place blocks in this claim!');
        return CANCEL;
    }
})

events.blockInteractedWith.on((ev) => {
    const xuid = ev.player.getXuid();
    const claim = getClaimAtPos(ev.blockPos, ev.player.getDimensionId());

    if (claim === undefined) {
        return;
    }

    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && ev.player.getCommandPermissionLevel() === CommandPermissionLevel.Normal) {
        ev.player.sendMessage('§cYou dont have permission to use blocks in this claim!');
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



    const xuid = ev.actor.getXuid();
    const claim = getClaimAtPos(ev, ev.actor.getDimensionId());

    if (claim === undefined) {
        return;
    }

    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && ev.actor.getCommandPermissionLevel() === CommandPermissionLevel.Normal) {
        ev.actor.sendMessage('§cYou dont have permission to use items in this claim!');
        return CANCEL;
    }
})

events.playerAttack.on((ev) => {
    const claim = getClaimAtPos(ev.victim.getPosition(), ev.victim.getDimensionId());
    if (claim === undefined) {
        return;
    }

    const xuid = ev.player.getXuid();

    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && ev.player.getCommandPermissionLevel() === CommandPermissionLevel.Normal) {
        ev.player.sendMessage('§cYou are not allowed to harm entities in this claim!');
        return CANCEL;
    }
})

events.blockInteractedWith.on((ev) => {
    const claim = getClaimAtPos(ev.blockPos, ev.player.getDimensionId());
    if (claim === undefined) {
        return;
    }

    const xuid = ev.player.getXuid();
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && ev.player.getCommandPermissionLevel() === CommandPermissionLevel.Normal) {
        return CANCEL;
    }
});

events.playerInteract.on((ev) => {
    const claim = getClaimAtPos(ev.victim.getPosition(), ev.victim.getDimensionId());
    if (claim === undefined) {
        return;
    }

    const xuid = ev.player.getXuid();
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && ev.player.getCommandPermissionLevel() === CommandPermissionLevel.Normal) {
        return CANCEL;
    }
})

events.entityStartRiding.on((ev) => {
    if (!ev.entity.isPlayer()) {
        return;
    }

    const claim = getClaimAtPos(ev.ride.getPosition(), ev.ride.getDimensionId());
    if (claim === undefined) {
        return;
    }

    const xuid = ev.entity.getXuid();
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && ev.entity.getCommandPermissionLevel() === CommandPermissionLevel.Normal) {
        return CANCEL;
    }
})

function handleItemUseClaimCheck(player: ServerPlayer) {
    const xuid = player.getXuid();
    const claim = getClaimAtPos(player.getPosition(), player.getDimensionId());

    if (claim === undefined) {
        return;
    }

    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && player.getCommandPermissionLevel() === CommandPermissionLevel.Normal) {
        player.sendMessage('§cYou dont have permission to use items in this claim!');
        return CANCEL;
    }
}

events.farmlandDecay.on((ev) => {
    if (!ev.culprit.isPlayer()) {
        return;
    }

    const claim = getClaimAtPos(ev.blockPos, ev.culprit.getDimensionId());
    if (claim === undefined) {
        return;
    }

    const xuid = ev.culprit.getXuid();
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && ev.culprit.getCommandPermissionLevel() === CommandPermissionLevel.Normal) {
        return CANCEL;
    }

    return;
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

    const claim = getClaimAtPos(pos, tiller.getDimensionId());
    if (claim === undefined) {
        return grassBlock$tryToTill.call(this, region, pos, tiller, item);
    }

    const xuid = tiller.getXuid();
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && tiller.getCommandPermissionLevel() === CommandPermissionLevel.Normal) {
        return false;
    }

    return grassBlock$tryToTill.call(this, region, pos, tiller, item);
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

    const claim = getClaimAtPos(pos, actor.getDimensionId());
    if (claim === undefined) {
        return _bucketItem_useOn.call(this, res, item, actor, pos, side, uVec3);
    }

    const xuid = actor.getXuid();
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && actor.getCommandPermissionLevel() === CommandPermissionLevel.Normal) {
        const falseResult = InteractionResult.allocate();
        falseResult.value = 0;
        return falseResult;
    }

    return _bucketItem_useOn.call(this, res, item, actor, pos, side, uVec3);
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
    const claim = getClaimAtPos(pos, player.getDimensionId());
    if (claim === undefined) {
        return block$use.call(this, player, pos, side);
    }

    const xuid = player.getXuid();
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && player.getCommandPermissionLevel() === CommandPermissionLevel.Normal) {
        player.sendMessage('§cYou dont have permission to use blocks in this claim!');
        return false;
    }

    return block$use.call(this, player, pos, side);
}

const itemFrameBlock$attack = procHacker.hooking(
    '?attack@ItemFrameBlock@@UEBA_NPEAVPlayer@@AEBVBlockPos@@@Z',
    bool_t,
    {this: Block},
    ServerPlayer,
    BlockPos,
)(onItemFrameAttack);

function onItemFrameAttack(this: Block, player: ServerPlayer, pos: BlockPos) {
    const claim = getClaimAtPos(pos, player.getDimensionId());
    if (claim === undefined) {
        return itemFrameBlock$attack.call(this, player, pos);
    }

    const xuid = player.getXuid();
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && player.getCommandPermissionLevel() === CommandPermissionLevel.Normal) {
        return false;
    }

    return itemFrameBlock$attack.call(this, player, pos);
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

    const claim = getClaimAtPos(pos, region.getDimensionId());
    if (claim === undefined) {
        return basePressurePlate$checkPressed.call(this, region, pos, presser, uNum1, uNum2);
    }

    const xuid = presser.getXuid();
    const claimMembers = claim.getMemberXuids();
    if (claim.owner !== xuid && !claimMembers.includes(xuid) && presser.getCommandPermissionLevel() === CommandPermissionLevel.Normal) {
        return;
    }

    return basePressurePlate$checkPressed.call(this, region, pos, presser, uNum1, uNum2);
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

