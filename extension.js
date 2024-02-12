const Main = imports.ui.main;
const GObject = imports.gi.GObject;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Clutter = imports.gi.Clutter;

const ExtensionUtils = imports.misc.extensionUtils;
const Self = ExtensionUtils.getCurrentExtension();

const SHORTCUT = 'invert-window-shortcut';

const levels = [
	{
		"r": 1.00000000,
		"g": 0.54360078,
		"b": 0.08679949,
	},
	{
		"r": 1.00000000,
		"g": 0.82854786,
		"b": 0.64816570,
	}, // 4K
	{
		"r": 1.00000000,
		"g": 1.00000000,
		"b": 1.00000000,
	}, // 6.5K
]

const TrueInvertWindowEffect = new GObject.registerClass({
	Name: 'TrueInvertWindowEffect',
	Properties: {
		'level': GObject.ParamSpec.double(
			'level',
			'Number Property',
			'A property holding a JavaScript Number',
			GObject.ParamFlags.READWRITE,
			Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER,
			0),
	},
}, class TrueInvertWindowEffect extends Clutter.ShaderEffect {
	vfunc_get_static_shader_source() {
		return `
			uniform bool invert_color;
			uniform float opacity = 1.0;
			uniform sampler2D tex;

			/**
			 * based on shift_whitish.glsl https://github.com/vn971/linux-color-inversion with minor edits
			 */
			void main() {
				vec4 c = texture2D(tex, cogl_tex_coord_in[0].st);

				float white_bias = c.a * 0.1; // lower -> higher contrast
				float m = 1.0 + white_bias;
				
				float shift = white_bias + c.a - min(c.r, min(c.g, c.b)) - max(c.r, max(c.g, c.b));
				
				c = vec4( c.r*${levels[this.level]["r"]}, c.g*${levels[this.level]["g"]}, c.b*${levels[this.level]["b"]} , c.a);

				cogl_color_out = c;
			}
		`;
	}

	vfunc_paint_target(paint_node = null, paint_context = null) {
		this.set_uniform_value("tex", 0);

		if (paint_node && paint_context)
			super.vfunc_paint_target(paint_node, paint_context);
		else if (paint_node)
			super.vfunc_paint_target(paint_node);
		else
			super.vfunc_paint_target();
	}
});

let invert_window;

function onWindowDestroyed(display, window) {
	// Handle window destruction
	log("Window destroyed: " + window.get_title());
}

function InvertWindow() {
	this.settings = ExtensionUtils.getSettings(Self.metadata["settings-schema"]);
	this.monitor = -1
	this.level = 0
}

InvertWindow.prototype = {
	toggle_effect: function () {
		global.get_window_actors().forEach(function (actor) {
			let meta_window = actor.get_meta_window();
			if(this.level === -1 || meta_window.get_monitor() !== this.monitor) {
				actor.remove_effect_by_name(`invert-color-0`);
				actor.remove_effect_by_name(`invert-color-1`);
				actor.remove_effect_by_name(`invert-color-2`);
				delete meta_window._invert_window_tag;
			}else {
				let effect = new TrueInvertWindowEffect({
					level: this.level
				});
				if(actor.get_effect(`invert-color-${this.level - 1}`)) {
					actor.remove_effect_by_name(`invert-color-${this.level - 1}`)
				}
				if(!actor.get_effect(`invert-color-${this.level}`) && meta_window.get_monitor() === this.monitor) {
					actor.add_effect_with_name(`invert-color-${this.level}`, effect);
					meta_window._invert_window_tag = true;
				}
			}
		}, this);
	},
	toggle_effect_shortcut: function () {
		if(this.level === undefined) {
			this.level = -1
		}
		const focusedWindow = global.display.get_focus_window();
		this.monitor = focusedWindow.get_monitor();
		if(this.level === 2) {
			this.level = -1;
		}else {
			this.level += 1;
		}
		invert_window.level = this.level
		invert_window.monitor = this.monitor
		invert_window.toggle_effect()
	},

	enable: function () {
		this.level = -1
		Main.wm.addKeybinding(
			SHORTCUT,
			this.settings,
			Meta.KeyBindingFlags.NONE,
			Shell.ActionMode.NORMAL,
			this.toggle_effect_shortcut
		);

		global.display.connect('window-created', this.toggle_effect);
		global.display.connect('window-entered-monitor', this.toggle_effect);
		global.display.connect('window-left-monitor', this.toggle_effect);

		global.get_window_actors().forEach(function (actor) {
			let meta_window = actor.get_meta_window();
			if (meta_window.hasOwnProperty('_invert_window_tag')) {
				let effect = new TrueInvertWindowEffect({
					level: this.level
				});
				actor.add_effect_with_name(`invert-color-${this.level}`, effect);
			}
		}, this);
	},

	disable: function () {
		Main.wm.removeKeybinding(SHORTCUT);
		global.display.disconnect('window-created', onWindowDestroyed);

		global.get_window_actors().forEach(function (actor) {
			actor.remove_effect_by_name('invert-color');
		}, this);
	}
};

function init() {
}

function enable() {
	invert_window = new InvertWindow();
	invert_window.enable();
}

function disable() {
	invert_window.disable();
	invert_window = null;
}

