import {Subject} from 'rxjs/Subject';
import {hot, expectObservable, expectSubscriptions, cold} from '../helpers/marble-testing';
import {CallObservable} from '../../src/Observable/CallObservable';
import {assertWampMessages, recordWampMessage, wampMessages} from '../helpers/wamp-testing';
import {CallMessage} from '../../src/Messages/CallMessage';
import {ResultMessage} from '../../src/Messages/ResultMessage';
import {WelcomeMessage} from '../../src/Messages/WelcomeMessage';
import {ErrorMessage} from '../../src/Messages/ErrorMessage';
import {WampErrorException} from '../../src/Common/WampErrorException';
import {xit as it} from '../helpers/test-helpers';

/** @test {call} */
describe('CallObservable', () => {

    it('should be never when source is never', () => {

        const messages = cold('-');
        const subscriptions = '^';
        const expected =      '-';

        const webSocket = new Subject();
        webSocket.subscribe(msg => {
            recordWampMessage(msg);
        });

        const call = new CallObservable('testing.uri', messages, webSocket);

        expectObservable(call).toBe(expected);
        expectSubscriptions(messages.subscriptions).toBe(subscriptions);

        assertWampMessages([
            [0, [48, 12345, {}, 'testing.uri']], // CallMessage
        ], wampMessages);
    });

    it('should complete when messages are empty before Welcome', () => {

        const messages =  hot('--|');
        const subscriptions = '^-!';
        const expected =      '--|';

        const webSocket = new Subject();
        webSocket.subscribe();

        const call = new CallObservable('testing.uri', messages, webSocket);

        expectObservable(call).toBe(expected);
        expectSubscriptions(messages.subscriptions).toBe(subscriptions);
    });

    it('should dispose of messages after non-progressive result', () => {
        const resultMessage = new ResultMessage(null, {}, [], {});

        const messages = hot( '--w--r------|', {w: new WelcomeMessage('12345', {}), r: resultMessage});
        const subscriptions = '^----!';
        const expected =      '-----(d|)';

        const webSocket = new Subject();
        webSocket.subscribe((msg: any) => {
            resultMessage['_requestId'] = msg.requestId;
        });

        const call = new CallObservable('testing.uri', messages, webSocket);

        expectObservable(call).toBe(expected, {d: resultMessage});
        expectSubscriptions(messages.subscriptions).toBe(subscriptions);
    });

    it('should emit empty args when result message args is empty', () => {
        const resultMessage = new ResultMessage(null, {}, [], {});

        const messages = hot( '--w--r|', {w: new WelcomeMessage('12345', {}), r: resultMessage});
        const subscriptions = '^----!';
        const expected =      '-----(d|)';

        const webSocket = new Subject();
        webSocket.subscribe((msg: any) => {
            resultMessage['_requestId'] = msg.requestId;
        });

        const call = new CallObservable('testing.uri', messages, webSocket);

        expectObservable(call).toBe(expected, {d: resultMessage});
        expectSubscriptions(messages.subscriptions).toBe(subscriptions);
    });

    it('should emit args when result message args has value', () => {
        const resultMessage = new ResultMessage(null, {}, ['testing'], {});

        const messages = hot( '--w-r|', {w: new WelcomeMessage('12345', {}), r: resultMessage});
        const subscriptions = '^---!';
        const expected =      '----(d|)';

        const webSocket = new Subject();
        webSocket.subscribe((msg: any) => {
            resultMessage['_requestId'] = msg.requestId;
        });

        const call = new CallObservable('testing.uri', messages, webSocket);

        expectObservable(call).toBe(expected, {d: resultMessage});
        expectSubscriptions(messages.subscriptions).toBe(subscriptions);
    });


    it('should emit args and argkw when result message args and argskw have values', () => {
        const resultMessage = new ResultMessage(null, {}, ['testing'], {foo: 'bar'});

        const messages = hot( '--w-r|', {w: new WelcomeMessage('12345', {}), r: resultMessage});
        const subscriptions = '^---!';
        const expected =      '----(d|)';

        const webSocket = new Subject();
        webSocket.subscribe((msg: any) => {
            resultMessage['_requestId'] = msg.requestId;
        });

        const call = new CallObservable('testing.uri', messages, webSocket);

        expectObservable(call).toBe(expected, {d: resultMessage});
        expectSubscriptions(messages.subscriptions).toBe(subscriptions);
    });


    it('should emit args, argkw and details when result message has args, argskw and details', () => {
        const resultMessage = new ResultMessage(null, {detail: 'thing'}, ['testing'], {foo: 'bar'});

        const messages = hot( '--w-r|', {w: new WelcomeMessage('12345', {}), r: resultMessage});
        const subscriptions = '^---!';
        const expected =      '----(d|)';

        const webSocket = new Subject();
        webSocket.subscribe((msg: any) => {
            resultMessage['_requestId'] = msg.requestId;
        });

        const call = new CallObservable('testing.uri', messages, webSocket);

        expectObservable(call).toBe(expected, {d: resultMessage});
        expectSubscriptions(messages.subscriptions).toBe(subscriptions);
    });

    it('should emit once when reconnected', () => {
        const resultMessage = new ResultMessage(null, {detail: 'thing'}, ['testing'], {foo: 'bar'});

        const messages = hot( '--w-r-w-r|', {w: new WelcomeMessage('12345', {}), r: resultMessage});
        const subscriptions = '^---!';
        const expected =      '----(d|)';

        const webSocket = new Subject();
        webSocket.subscribe((msg: any) => {
            resultMessage['_requestId'] = msg.requestId;
        });

        const call = new CallObservable('testing.uri', messages, webSocket);

        expectObservable(call).toBe(expected, {d: resultMessage});
        expectSubscriptions(messages.subscriptions).toBe(subscriptions);
    });

    it('should emit error when error is emitted before welcome', () => {
        const resultMessage = new ResultMessage(null, {detail: 'thing'}, ['testing'], {foo: 'bar'});

        const messages = hot( '-#w-r|', {w: new WelcomeMessage('12345', {}), r: resultMessage}, new Error());
        const subscriptions = '^!';
        const expected =      '-#';

        const webSocket = new Subject();
        webSocket.subscribe((msg: any) => {
            recordWampMessage(msg);
            if (msg instanceof CallMessage) {
                resultMessage['_requestId'] = msg.requestId;
            }
        });

        const call = new CallObservable('testing.uri2', messages, webSocket);

        expectObservable(call).toBe(expected, null, new Error());
        expectSubscriptions(messages.subscriptions).toBe(subscriptions);

        assertWampMessages([
            [0, [48, 12345, {}, 'testing.uri2']], // CallMessage
        ], wampMessages);
    });

    it('should emit error when error is emitted after welcome', () => {

        const resultMessage = new ResultMessage(null, {detail: 'thing'}, ['testing'], {foo: 'bar'});

        const messages = hot( '-w#-r|', {w: new WelcomeMessage('12345', {}), r: resultMessage}, new Error());
        const subscriptions = '^-!';
        const expected =      '--#';

        const webSocket = new Subject();
        webSocket.subscribe((msg: any) => {
            recordWampMessage(msg);
            if (msg instanceof CallMessage) {
                resultMessage['_requestId'] = msg.requestId;
            }
        });

        const call = new CallObservable('testing.uri2', messages, webSocket);

        expectObservable(call).toBe(expected, null, new Error());
        expectSubscriptions(messages.subscriptions).toBe(subscriptions);

        assertWampMessages([
            [0, [48, 12345, {}, 'testing.uri2']], // CallMessage
        ], wampMessages);
    });

    it('should emit when error is thrown while sending a message', () => {
        const error = new Error();

        const resultMessage = new ResultMessage(null, {detail: 'thing'}, ['testing'], {foo: 'bar'});

        const messages = hot( '--w-r|', {w: new WelcomeMessage('12345', {}), r: resultMessage});
        const expected =      '#';

        const webSocket = new Subject();
        webSocket.subscribe((msg: any) => {
            throw error;
        });

        const call = new CallObservable('testing.uri', messages, webSocket);

        expectObservable(call).toBe(expected, null, error);
        expectSubscriptions(messages.subscriptions).toBe([]);

    });

    it('should emit error when error message is received', () => {

        const errorMessage = new ErrorMessage(123, null, {}, 'some.server.error');

        const messages = hot( '--w-e|', {w: new WelcomeMessage('12345', {}), e: errorMessage});
        const subscriptions = '^---!';
        const expected =      '----#';

        const webSocket = new Subject();
        webSocket.subscribe((msg: any) => {
            if (msg instanceof CallMessage) {
                errorMessage['_errorRequestId'] = msg.requestId;
            }
            recordWampMessage(msg);
        });

        const call = new CallObservable('testing.uri', messages, webSocket);

        expectObservable(call).toBe(expected, null, new WampErrorException('some.server.error'));
        expectSubscriptions(messages.subscriptions).toBe(subscriptions);

        assertWampMessages([
            [0, [48, 12345, {}, 'testing.uri']], // CallMessage
        ], wampMessages);
    });

    it('should not emit if disposed before result', () => {
        const resultMessage = new ResultMessage(null, {detail: 'thing'}, ['testing'], {foo: 'bar'});

        const messages = hot( '--w---r|', {w: new WelcomeMessage('12345', {}), e: resultMessage});
        const subscriptions = '^---!';
        const unsubscribe =   '----!';
        const expected =      '';

        const webSocket = new Subject();
        webSocket.subscribe((msg: any) => {
            resultMessage['_requestId'] = msg.requestId;
            recordWampMessage(msg);
        });

        const call = new CallObservable('testing.uri1', messages, webSocket);

        expectObservable(call, unsubscribe).toBe(expected);
        expectSubscriptions(messages.subscriptions).toBe(subscriptions);

        assertWampMessages([
            [0, [48, 12345, {}, 'testing.uri1']], // CallMessage
            [40, [49, 12345, {}]] // CancelMessage
        ], wampMessages);
    });

    it('should emit if disposed after result', () => {
        const resultMessage = new ResultMessage(null, {detail: 'thing'}, ['testing'], {foo: 'bar'});

        const messages = hot( '--w-r---|', {w: new WelcomeMessage('12345', {}), r: resultMessage});
        const subscriptions = '^---!';
        const unsubscribe =   '------!';
        const expected =      '----(d|)';

        const webSocket = new Subject();
        webSocket.subscribe((msg: any) => {
            resultMessage['_requestId'] = msg.requestId;
            recordWampMessage(msg);
        });

        const call = new CallObservable('testing.uri2', messages, webSocket);

        expectObservable(call, unsubscribe).toBe(expected, {d: resultMessage});
        expectSubscriptions(messages.subscriptions).toBe(subscriptions);

        assertWampMessages([
            [0, [48, 12345, {}, 'testing.uri2']], // CallMessage
        ], wampMessages);
    });
});
