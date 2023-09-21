import './claimCommand';
import './modClaimCommand';
import './playtimeCommand';
import './configCommand';
import {fireEvent} from "../events/eventStorage";
import {CommandsRegisteredEvent} from "../events/commandsRegisteredEvent";

fireEvent(CommandsRegisteredEvent.ID, undefined);