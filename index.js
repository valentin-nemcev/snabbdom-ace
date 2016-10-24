import assert from 'assert';

import ace from 'brace';
import 'brace/theme/clouds';
import 'brace/mode/json';
import 'brace/ext/searchbox';

import './index.css';

const aceEditorModule = {
    _editors: new WeakMap(),

    // https://github.com/ajaxorg/ace/blob/master/lib/ace/commands/default_commands.js
    // Remove commands that shadow native browser keybindings or require
    // loading additional code from ext/
    commandsBlacklist: [
        'showSettingsMenu',
        'goToNextError',
        'goToPreviousError',
        'gotoline',
        'jumptomatching',
        'transposeletters',
    ],

    create: (oldVnode, vnode) => {
        if (!vnode.data.aceEditor) return;
        const {mode, options = {}} = vnode.data.aceEditor;

        const elm = vnode.elm;
        const aceEl = document.createElement('div');
        const editor = ace.edit(aceEl);
        editor.$blockScrolling = Infinity; // Disable warning
        editor.setTheme('ace/theme/clouds');
        editor.setShowPrintMargin(false);
        editor.setOptions({
            minLines: 3,
            maxLines: Infinity,
            ...options,
        });

        aceEditorModule.commandsBlacklist
            .forEach(c => editor.commands.removeCommand(c));

        const session = editor.getSession();
        session.setMode('ace/mode/' + mode);
        session.setUseWrapMode(true);
        session.on(
            'change',
            () => {
                // Change was initiated by user, not API call
                if (editor.curOp && editor.curOp.command.name) {
                    elm.value = editor.getValue();
                    // For snabbdom native event listeners, no IE <=11 support
                    elm.dispatchEvent(new Event('change', {bubbles: true}));
                }
            }
        );

        aceEditorModule._editors.set(elm, editor);

        // Defer initial update for better perceived performance when text is
        // long
        setTimeout(() => aceEditorModule._updateValue(editor, vnode), 1);

        const hook = vnode.data.hook = vnode.data.hook || {};
        assert(
            hook.insert == null,
            'Insert hook already exists for ' + vnode.sel
        );
        hook.insert = () => {
            elm.hidden = true;
            elm.after(aceEl);
        };
    },

    _updateValue(editor, vnode) {
        const selection = editor.session.selection.toJSON();
        editor.setValue(vnode.text != null ? vnode.text : '', -1);
        editor.session.selection.fromJSON(selection);
    },

    update: (oldVnode, vnode) => {
        if (!vnode.data.aceEditor) return;
        assert.deepEqual(
            oldVnode.data.aceEditor,
            vnode.data.aceEditor,
            'aceEditor changed for ' + vnode.sel
        );

        if (oldVnode.elm.value !== vnode.text) {
            const editor = aceEditorModule._editors.get(vnode.elm);
            aceEditorModule._updateValue(editor, vnode);
        }
    },

    destroy: (vnode) => {
        if (!vnode.data.aceEditor) return;

        const hook = vnode.data.hook || {};
        delete hook.insert;
        const editor = aceEditorModule._editors.get(vnode.elm);
        editor.destroy();
        editor.container.remove();
    },
};

export default aceEditorModule;
