KSP steam version is integrated with Steam Input. When launching the game from steam, you can use a controller template provided by Squad to play KSP. 

Squad template is using "action sets" (nothing to see with KSP action sets !!). So, the game is aware of steam input, and ask the controller to switch from one action set to another on different situations. For example, when entering the VAB, KSP will switch the controller from the "Menu" action set, to the "Editor" action set, which defines a complete new set of bindings. This is the same when you launch a rocket : KSP will switch to the "Flight" action set, which also defines a complete new set of bindings.

This is (almost) working fine. The 1.6 new maneuver tools broke things, but you can have a look at this [issue](https://bugs.kerbalspaceprogram.com/issues/22165) for a workaround. You will find a link to a working SteamController plugin (which also makes other controller work).

So, where is the problem ?

KSP is DRM free. Even with the Steam version. Just get the "Kerbal Space Program" folder in your steam "common" folder, copy/paste it, double click the "KSP_x64.exe" executable file, and you're up. This is very usefull - for example - to play heavily modded versions (I love RP-1) AND the stock version at the same time.

The problem is that when you launch KSP by hand, you will not have Steam Input. A solution seems to add a shortcut in Steam ("Add a non steam product" in the lower left corner). This is working, as you will have Steam Input, but KSP will not be linked to Steam itself, and will no longer be able to switch between action sets. You will be stuck in the "Menu" action set.

So, I wrote this configuration file to play RP-1 with my "Raiju Tournament Edition" PS4 controller. 

Right stick button R3 and left stick button L3 must be mapped to the M3 and M4 back buttons of the Raiju. They are used to each maintain an different additionnal layer. This configuration can be reproduced with a XBox Elite Controller for example. But as I'm using the integrated mouse pad for action groups and action sets (as defined in KSP this time !), this configuration is not transposable as is.

The configuration is a set of 3 layers :

- The main layer contains all the actions common to the editor and the flight mode.
- Maintaining R3 (mapped to M4 Raiju right back button) will surimpose a new layer, and specialize the controls for flight mode.
- Maintaining L3 (mapped to M3 Raiju left back button) will surimpose an other new layer, and add specialize the controls for editor mode.

So, when in the editor (VAB or SPH), use the normal controls, and additionnal controls obtained by maintaining the left back button. And when in flight mode, use the normal controls, and additionnal controls obtained by maintaining the right back button.

Also note that right and left click a bound to the right and left directionnal pad buttons. It works well. But with the Raiju, you can bind those two directions to the M1 and M2 buttons (the one next to the triggers) which make the configuration even more pleasant.

# To use this configuration 

I will publish this configuration to the steam community. Just search for the user "lhervier". 

If you want to try it before it is published, copy the vdf file to this folder :

    ${STEAM_ROOT}/userdata/<your steam id>/config/controller_configs/apps/220200/<id of your controller>/guest/
  
You may have to create a dummy configuration file before the folder exist.

# Bindings

- 🟢 Only usefull when in flight mode (so, mainly in Flight layer)
- 🔵 Only usefull when in editor mode (so, mainly in Editor layer)
- No bullet means the control is usefull in both modes


| Control                          | No Layer                                             | Editor Layer : M3 (=L3) maintained     | Flight Layer : M4 (=R3) maintained
| -------------------------------- | ---------------------------------------------------- | -------------------------------------- | ----------------------------
| **Options (short press)**        | 🟢 ESC (Menu)                                       | 🔵CTRL+Y : Redo                        | 🟢ALT+F12 : Debug Menu
| **Options (Long press)**         |                                                      |                                        | 🟢] : Next vessel
| **Share (short press)**          | 🟢M (Map)                                           | 🔵CTRL+Z : Undo                        | 
| **Share (Long press)**           | SUPPR                                                |                                        | 🟢[ : Prev vessel
|                                  | - 🟢Flight: Toggle docking mode                      |                                        | 
|                                  | - 🔵Editor : Remove part                             |                                        |
| **R1 button**                    | Q (roll left)                                        |                                        | 🟢TAB : Next Body
| **L1 button**                    | E (roll right)                                       |                                        | 🟢SHIFT+TAB : Prev Body
| **Mousepad right half**          | 🟢Radial menu F6/F7 : Switch action set              |                                        |
| **Mousepad left half**           | Radial menu 1 ... 0 :                                |                                        |
|                                  | - 🟢Flight : Execute action group                    |                                        |
|                                  | - 🔵Editor : Gizmo (Select, move, rotate and reroot) |                                        |
| **R2 button (Partial press)**    | 🟢Left Shift : Incr Throttle                         |                                        | 🟢H : Trans. Fwd
| **R2 button (Full press)**       | 🟢Z : Full throttle                                  |                                        | 🟢H : Trans. Fwd
| **L2 button (Partial press)**    | 🟢Left Ctrl : Decr Throttle                          |                                        | 🟢N : Trans. backward
| **L2 button (Full press)**       | 🟢X : Kill throttle                                  |                                        | 🟢N : Trans. backward
| **Right Stick**                  | Move mouse                                           |                                        | 
| **M4 button (mapped as R3)**     | Maintain to apply "Flight" layer                     |                                        |
| **Left Stick Up**                | W : Pitch down                                       | 🔵Keypad + : Zoom+ in VAB              | 🟢K : Trans. Up
| **Left Stick Down**              | S : Pitch up                                         | 🔵Keypad - : Zoom- in VAB              | 🟢I : Trans. Down
| **Left Stick Left**              | A : Yaw left                                         |                                        | 🟢J : Trans. Left
| **Left Stick Right**             | D : Yaw right                                        |                                        | 🟢L : Trans. Right
| **M3 button (mapped as L3)**     | Maintain to apply "Editor" layer                     |                                        |
| **Cross button**                 | SPACE :                                              |                                        | 🟢CAPS : Precision controls
|                                  | - 🟢Flight : Stage                                   |                                        | 
|                                  | - 🔵Editor : Reset part rotation                     |                                        |
| **Circle button**                | F :                                                  | 🔵C : Toggle magnetism                 | 🟢B : Enter cockpit
|                                  | - 🟢Flight: Catch vessel                             |                                        | 
|                                  | - 🔵Editor : Positionning local/abs                  |                                        |
| **Square button**                | R :                                                  | 🔵X : Cycle through symmeteries        | 🟢. : Incr. Timewrapcamera
|                                  | - 🟢Flight : Toggle RCS                              |                                        |
|                                  | - 🔵Editor : Mirror/Radial symmetery                 |                                        |
| **Triangle button**              | 🟢T : Toggle SAS                                     | 🔵Open steam Keyboard                  | 🟢, : Decr. Timewrap
| **DPad Up**                      | Mouse Wheel up : Zoom +                              | 🔵Page Up : Move camera Up             | 🟢C : Change 
| **DPad Down**                    | Mouse Wheel down : Zoom -                            | 🔵Page Down : Move camera Down         | 🟢V : Change view
| **M1 (mapped as DPad Left)**     | Right click                                          | 🔵SHIFT+Right click : Translation look | 🟢ALT+Right Click : Multiple menus
| **M2 (mapped as DPad Right)**    | Left Click                                           | 🔵ALT+Left click : Duplicate part      | 🟢ALT+Left Click : Select Vessel*

(*) This binding for [Easy Vessel Switch](https://github.com/ihsoft/EasyVesselSwitch), a mod that I cannot play KSP without.
