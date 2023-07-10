"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupCreatedEvent = void 0;
const eventStorage_1 = require("./eventStorage");
var GroupCreatedEvent;
(function (GroupCreatedEvent) {
    GroupCreatedEvent.ID = 'GroupCreatedEvent';
    GroupCreatedEvent.CANCELABLE = true;
    GroupCreatedEvent.ASYNC_ALLOWED = true;
    function register(callback) {
        (0, eventStorage_1.registerEvent)(GroupCreatedEvent.ID, callback);
    }
    GroupCreatedEvent.register = register;
    async function handleFireCallbacks(callbacks, data) {
        let shouldExecute = true;
        for (const callback of callbacks) {
            const callbackResult = callback(data.group, data.ownerXuid);
            let res;
            if (typeof callbackResult === "boolean") {
                res = callbackResult;
            }
            else {
                res = await callbackResult;
            }
            if (res !== undefined && !res) {
                shouldExecute = false;
            }
        }
        return shouldExecute;
    }
    GroupCreatedEvent.handleFireCallbacks = handleFireCallbacks;
})(GroupCreatedEvent = exports.GroupCreatedEvent || (exports.GroupCreatedEvent = {}));
(0, eventStorage_1.registerEventType)(GroupCreatedEvent);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JvdXBDcmVhdGVkRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJncm91cENyZWF0ZWRFdmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxpREFBZ0U7QUFFaEUsSUFBaUIsaUJBQWlCLENBNEJqQztBQTVCRCxXQUFpQixpQkFBaUI7SUFDakIsb0JBQUUsR0FBRyxtQkFBbUIsQ0FBQztJQUN6Qiw0QkFBVSxHQUFHLElBQUksQ0FBQztJQUNsQiwrQkFBYSxHQUFHLElBQUksQ0FBQztJQUdsQyxTQUFnQixRQUFRLENBQUMsUUFBa0I7UUFDdkMsSUFBQSw0QkFBYSxFQUFDLGtCQUFBLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRmUsMEJBQVEsV0FFdkIsQ0FBQTtJQUVNLEtBQUssVUFBVSxtQkFBbUIsQ0FBQyxTQUFxQixFQUFFLElBQVM7UUFDdEUsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDO1FBQ3pCLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFO1lBQzlCLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM1RCxJQUFJLEdBQVksQ0FBQztZQUNqQixJQUFJLE9BQU8sY0FBYyxLQUFLLFNBQVMsRUFBRTtnQkFDckMsR0FBRyxHQUFHLGNBQWMsQ0FBQzthQUN4QjtpQkFBTTtnQkFDSCxHQUFHLEdBQUcsTUFBTSxjQUFjLENBQUM7YUFDOUI7WUFFRCxJQUFJLEdBQUcsS0FBSyxTQUFTLElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQzNCLGFBQWEsR0FBRyxLQUFLLENBQUM7YUFDekI7U0FDSjtRQUVELE9BQU8sYUFBYSxDQUFDO0lBQ3pCLENBQUM7SUFqQnFCLHFDQUFtQixzQkFpQnhDLENBQUE7QUFDTCxDQUFDLEVBNUJnQixpQkFBaUIsR0FBakIseUJBQWlCLEtBQWpCLHlCQUFpQixRQTRCakM7QUFFRCxJQUFBLGdDQUFpQixFQUFDLGlCQUFpQixDQUFDLENBQUMifQ==