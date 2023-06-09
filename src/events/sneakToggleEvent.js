"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SneakToggleEvent = void 0;
const eventStorage_1 = require("./eventStorage");
const event_1 = require("bdsx/event");
var SneakToggleEvent;
(function (SneakToggleEvent) {
    SneakToggleEvent.ID = 'SneakToggleEvent';
    SneakToggleEvent.CANCELABLE = false;
    function register(callback) {
        (0, eventStorage_1.registerEvent)(SneakToggleEvent.ID, callback);
    }
    SneakToggleEvent.register = register;
    function handleFireCallbacks(callbacks, data) {
        for (const callback of callbacks) {
            callback(data.player);
        }
    }
    SneakToggleEvent.handleFireCallbacks = handleFireCallbacks;
})(SneakToggleEvent = exports.SneakToggleEvent || (exports.SneakToggleEvent = {}));
(0, eventStorage_1.registerEventType)(SneakToggleEvent);
event_1.events.entitySneak.on((ev) => {
    if (ev.entity.isPlayer() && !ev.isSneaking) {
        (0, eventStorage_1.fireEvent)(SneakToggleEvent.ID, { player: ev.entity });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25lYWtUb2dnbGVFdmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNuZWFrVG9nZ2xlRXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsaURBQTJFO0FBRTNFLHNDQUFrQztBQUVsQyxJQUFpQixnQkFBZ0IsQ0FjaEM7QUFkRCxXQUFpQixnQkFBZ0I7SUFDaEIsbUJBQUUsR0FBRyxrQkFBa0IsQ0FBQztJQUN4QiwyQkFBVSxHQUFHLEtBQUssQ0FBQztJQUdoQyxTQUFnQixRQUFRLENBQUMsUUFBa0I7UUFDdkMsSUFBQSw0QkFBYSxFQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRmUseUJBQVEsV0FFdkIsQ0FBQTtJQUVELFNBQWdCLG1CQUFtQixDQUFDLFNBQXFCLEVBQUUsSUFBUztRQUNoRSxLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRTtZQUM5QixRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3pCO0lBQ0wsQ0FBQztJQUplLG9DQUFtQixzQkFJbEMsQ0FBQTtBQUNMLENBQUMsRUFkZ0IsZ0JBQWdCLEdBQWhCLHdCQUFnQixLQUFoQix3QkFBZ0IsUUFjaEM7QUFFRCxJQUFBLGdDQUFpQixFQUFDLGdCQUFnQixDQUFDLENBQUM7QUFFcEMsY0FBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtJQUN6QixJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFO1FBQ3hDLElBQUEsd0JBQVMsRUFBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsRUFBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUM7S0FDdkQ7QUFDTCxDQUFDLENBQUMsQ0FBQSJ9