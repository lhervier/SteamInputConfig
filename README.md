KSP steam version is integrated with Steam Input. When launching the game from steam, you can use a controller template provided by Squad to play KSP. 

But Squad template is using "action sets". So, the game is aware of steam input, and ask the controller to switch from one action set to another on different situations. For example, when entering the VAB, KSP will switch the controller from the "Menu" action set, to the "Editor" action set, which defines a complete new set of bindings. This is the same when you launch a rocket : KSP will switch to the "Flight" action set, which also defines a complete new set of bindings.

This is (almost) working fine. The 1.6 new maneuver tools are breaking things, but you can have a look at this [issue](https://bugs.kerbalspaceprogram.com/issues/22165) for a workaround. You will find a link to a working SteamController plugin (which also makes other controller work).

So, where is the problem ?

KSP is DRM free. Even with the Steam version. Just get the "Kerbal Space Program" folder in your steam "common" folder, copy/paste it, double click the "KSP_x64.exe" executable file, and you're up. This is very usefull - for example - to play heavily modded versions (I love RP-1) AND the stock version at the same time.

The problem is that when you launch KSP by hand, you will not have Steam Input. A solution seems to add a shortcut in Steam ("Add a non steam product" in the lower left corner). This is working, as you will have Steam Input, but KSP will not be linked to Steam itself, and will no longer be able to switch between action sets. You will be stuck in the "Menu" action set.

So, I write this configuration file to play RP-1 with my "Raiju Tournament Edition" PS4 controller. 

Right stick button R3 and left stick button L3 must be mapped to the M3 and M4 back buttons of the Raiju. They are used to each maintain an different additionnal layer. This configuration can be reproduced with a XBox Elite Controller for example. But as I'm using the integrated mouse pad for action groups and action sets, this configuration is not transposable as is.

The configuration is a set of 3 layers :

- The main layer contains all the actions common to the editor and the flight mode.
- Maintaining R3 (mapped to M4 Raiju back button) will surimpose a new layer, and add controls needed for flight mode.
- Maintaining L3 (mapped to M3 Raiju back button) will surimpose an other new layer, and add controls needed for editor mode.

So, when in the editor, use the normal controls, and additionnal controls obtained by maintaining the left back button. And when in flight mode, use the normal controls, and additionnal controls obtained by maintaining the right back button.

Also note that right and left click a bound to the right and left directionnal pad buttons. With the Raiju, you can bind those two directions to the M1 and M2 buttons (the one next to the triggers).

# To use this configuration 

I will publish this configuration to the steam community. Just search for the user "lhervier". 

If you want to try it before it is published, copy the vdf file to this folder :

    ${STEAM_ROOT}/userdata/<your steam id>/config/controller_configs/apps/220200/<id of your controller>/guest/
  
220200 is the KSP Steam game id.

You may have to create a dummy configuration file before the folder exist.
