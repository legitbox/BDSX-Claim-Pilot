import {SneakToggleEvent} from "../events/sneakToggleEvent";
import {deleteItemFromArray, generateBox, getPlayersFromXuids, isWand} from "../utils";
import {events} from "bdsx/event";
import {CONFIG} from "../configManager";
import {getOwnedClaims, getOwnedOrMemberedClaims} from "./claim";
import {bedrockServer} from "bdsx/launcher";
import {Vec3} from "bdsx/bds/blockpos";
import {MinecraftPacketIds} from "bdsx/bds/packetids";
import {CANCEL} from "bdsx/common";
import {decay} from "bdsx/decay";
import isDecayed = decay.isDecayed;
import Timeout = NodeJS.Timeout;
import {isPlayerServerBuilder} from "./claimBuilder";

let activeViewList: string[] = [];

SneakToggleEvent.register(onSneakToggle);

function onSneakToggle(playerXuid: string) {
    if (isDecayed(bedrockServer.level)) {
        return;
    }

    const player = bedrockServer.level.getPlayerByXuid(playerXuid);
    if (player === null) {
        return;
    }

    const heldItem = player.getCarriedItem();
    if (!isWand(heldItem)) {
        return;
    }

    const state = toggleVisualizer(player.getXuid());

    player.sendMessage(!state ? '§aShowing claims!' : '§aHiding claims!');
}

function toggleVisualizer(xuid: string) {
    const res = activeViewList.includes(xuid);

    if (res) {
        activeViewList = deleteItemFromArray(xuid, activeViewList);
    } else {
        activeViewList.push(xuid);
    }

    return res;
}

let visualizerInterval: Timeout | undefined = undefined;
let claimViewer: string | undefined = undefined;

events.serverOpen.on(() => {
    visualizerInterval = setInterval(() => {
        if (isDecayed(bedrockServer.level)) {
            clearInterval(visualizerInterval);
            return;
        } else if (!CONFIG.visualiserEnabled) {
            return;
        }

        const players = getPlayersFromXuids(activeViewList);

        for (const player of players) {
            const xuid = player.getXuid();
            let claims;
            if (isPlayerServerBuilder(xuid)) {
                claims = getOwnedClaims("SERVER", true);
            } else {
                claims = getOwnedOrMemberedClaims(xuid);
            }

            if (claims.length === 0) {
                continue;
            }

            claimViewer = xuid;

            for (const claim of claims) {
                if (player.getDimensionId() !== claim.dimension) {
                    continue;
                }

                const dimension = bedrockServer.level.getDimension(claim.dimension);
                if (dimension === null) {
                    continue;
                }

                const box = generateBox(claim.cornerOne, claim.cornerEight);

                for (const point of box) {
                    bedrockServer.level.spawnParticleEffect(CONFIG.visualiseParticle, Vec3.create(point), dimension);
                }
            }

            claimViewer = undefined;
        }
    }, CONFIG.visualizerUpdateRate);
})

events.packetSend(MinecraftPacketIds.SpawnParticleEffect).on((_p, ni) => {
    if (claimViewer === undefined) {
        return;
    }

    const player = ni.getActor();
    if (player === null) {
        return CANCEL;
    }

    const xuid = player.getXuid();

    if (claimViewer !== xuid) {
        return CANCEL;
    }
})
