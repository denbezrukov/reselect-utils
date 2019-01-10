import * as React from 'react';
import {storiesOf} from '@storybook/react';
import {action} from '@storybook/addon-actions';
import {createSelector} from 'reselect';
import SelectorGraph from './SelectorGraph';
// @ts-ignore
import {selectorGraph, registerSelectors, reset} from 'reselect-tools';
import {Message, Person, state, State} from "../__data__/state";
import {createAdaptedSelector} from "../createAdaptedSelector";
import SelectorMonad from "../SelectorMonad";
import {CSSProperties} from "react";
import {Selector} from "../types";

const getPerson = (state: State, props: { id: number }) => state.persons[props.id];
const getMessage = (state: State, props: { id: number }) => state.messages[props.id];
const getDocument = (state: State, props: { id: number }) => state.documents[props.id];

const getFullName = createSelector(
    [
        getPerson,
    ],
    ({firstName, secondName}) => `${firstName} ${secondName}`
);

class SelectorMonadGraph extends React.Component<{ onCallButtonClick?: () => void }> {
    private containerStyle: CSSProperties = {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    };

    private onCallButtonClick = () => {
        if (this.props.onCallButtonClick) {
            this.props.onCallButtonClick();
        }

        this.forceUpdate();
    };

    render() {
        const {nodes, edges} = selectorGraph();

        return (
            <div style={this.containerStyle}>
                <div>
                    <button onClick={this.onCallButtonClick}>
                        Call monadic selector
                    </button>
                </div>
                <SelectorGraph
                    nodes={nodes}
                    edges={edges}
                    onNodeClick={(name, node) => action(name)(node)}
                    style={{height: undefined, flexGrow: 1}}
                />
            </div>
        )
    }
}

storiesOf('SelectorMonad', module)
    .add('entity chain example', () => {
        const getPersonByDocumentId = SelectorMonad.of(getDocument)
            .chain(document => (
                createAdaptedSelector(getMessage, {id: document.messageId}))
            )
            .chain(message => (
                createAdaptedSelector(getFullName, {id: message.personId}))
            )
            .buildSelector();


        reset();
        registerSelectors({
            getPerson,
            getMessage,
            getDocument,
            getFullName,
            getPersonByDocumentId,
        });

        const onCallButtonClick = () => {
            const personByDocumentId = getPersonByDocumentId(state, {id: 111});
            action('personByDocumentId')(personByDocumentId)
        };

        return (
            <SelectorMonadGraph onCallButtonClick={onCallButtonClick}/>
        )
    })
    .add('aggregation example', () => {
        const getPersons = (state: State) => state.persons;

        const getLongestFullName =
            SelectorMonad.of(getPersons)
                .chain(persons => {
                    const dependencies = Object.values(persons).map(person => (
                        createAdaptedSelector(getFullName, {id: person.id}))
                    );

                    return createSelector(
                        dependencies,
                        (...fullNames) => fullNames
                            .reduce((longest, current) => (
                                current.length > longest.length
                                    ? current
                                    : longest
                            ))
                    );
                })
                .buildSelector();

        reset();
        registerSelectors({
            getPerson,
            getPersons,
            getFullName,
            getLongestFullName,
        });

        const onCallButtonClick = () => {
            const longestFullName = getLongestFullName(state);
            action('longestFullName')(longestFullName)
        };

        return (
            <SelectorMonadGraph onCallButtonClick={onCallButtonClick}/>
        )
    })

    .add('switch dependency example', () => {
        const getPersonOrMessageByDocumentId =
            SelectorMonad.of(getDocument)
                .chain(document => (
                    document.messageId === 100
                        ? createAdaptedSelector(getPerson, {id: 1})
                        : createAdaptedSelector(getMessage, {id: document.messageId})
                ) as Selector<State, Person | Message>)
                .buildSelector();

        reset();
        registerSelectors({
            getPerson,
            getMessage,
            getDocument,
            getPersonOrMessageByDocumentId,
        });

        const onCallButtonClick = () => {
            const longestFullName = Math.random() > 0.5
                ? getPersonOrMessageByDocumentId(state, {id: 111})
                : getPersonOrMessageByDocumentId(state, {id: 222});

            action('longestFullName')(longestFullName)
        };

        return (
            <SelectorMonadGraph onCallButtonClick={onCallButtonClick}/>
        )
    });
