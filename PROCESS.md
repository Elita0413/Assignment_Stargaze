## Starting idea
The assignment asks for an interactive experience with a clear input-response-feedback loop. I started with a generic particle field — move the mouse, particles react. It worked technically but felt hollow: the interaction was visually impressive but didn't mean anything. The brief says "what should happen because of their action?" and I didn't have a good answer beyond "particles move."

I thought about what would give the interaction meaning — what real-world relationship could the mouse-pushing-particles metaphor represent? The answer was light pollution: the city's artificial glow is literally a veil of particles that hides the stars. Moving the cursor to "part the light" becomes a metaphor for revealing what's always been there but we can't see.
This gave every interaction a purpose:
- Move = parting the veil of light pollution
- Click = scattering the light forcefully (a shockwave)
- Reveal stars = the reward for clearing the light
- Narrative messages = the meaning behind why the stars are hidden
The experience now has a theme (light pollution), an emotional arc (from veiled to revealed), and a message (we've lost something, but it's still there).

## Design and code changes
### Change 1: From single canvas to dual-layer
The original particle field had one canvas with everything on it. When I added the concept of "hidden stars beneath light pollution," I realised I needed two separate layers: a background (stars) that's always rendering, and a foreground (light) that partially obscures it. Using destination-out compositing on the foreground layer, the light particles create a semi-transparent veil — where they're dense, you can't see through; where they've been pushed away, the stars show through.
This was the foundational architectural decision. Everything else flows from having two layers that interact.
### Change 2: Star revelation system
The key question was: how does the program know when a star is "revealed"? I implemented a proximity-based system: each frame, each star checks nearby light particles. If the combined opacity of nearby light is above a threshold, the star stays hidden (its revealAlpha eases toward 0). When light particles disperse and the combined opacity drops, the star's revealAlpha eases toward 1 — it fades in.
This creates a smooth, organic relationship between the two layers. Stars don't just pop in — they breathe into existence as the light recedes.
### Change 3: Diffraction spikes on bright stars
I wanted the stars to look real, not just like white dots. About 8% of stars are marked as "bright" — these get cross-shaped diffraction spikes (the lines you see in telescope photos, caused by the telescope's support struts). This is a small detail that makes the sky feel like a photograph rather than a screensaver. The spikes are drawn as thin lines radiating from the star, with additive blending so they glow.
### Change 4: Nebula clouds
A truly dark sky isn't just black with dots — it has faint colour from interstellar gas. I added 4–6 slow-drifting nebula clouds using radial gradients with very low alpha. They're barely visible individually but together they give the background a subtle depth.
### Change 5: Narrative system
This is the "meaning" layer. As the user reveals stars and the "Sky Cleared" percentage passes thresholds (5%, 15%, 30%, 50%, 70%), italic text appears on the left side of the screen. The messages are facts about light pollution: "80% of the world lives under a light-polluted sky…" and "A child born today may never see the Milky Way."
The narrative gives the interaction a point. You're not just playing with particles — you're experiencing a metaphor for a real environmental issue. The final message — "Every star was always there. We just forgot to look up." — closes the loop: the stars were never gone, only hidden.
### Change 6: Shooting stars (meteors)
I added random meteors that streak across the background with fading trails. They're rare (0.08% chance per frame, max 2 at a time) so they feel special. The "Wish" button lets the user manually trigger one — a playful connection to the tradition of making a wish on a shooting star. The toast message for this is "Make a wish."
### Change 7: Weather system (replacing colour themes)
The original version had four colour themes (Midnight, Dawn, Dusk, Aurora) that were purely decorative — they changed the palette but didn't affect behaviour. I replaced them with four weather conditions that have real gameplay consequences:
- Clear — no weather effects, full star visibility
- Cloudy — 5 drifting cloud formations, stars dimmed to 75% visibility
- Foggy — drifting fog blobs + clouds, stars dimmed to 50%
- Stormy — heavy clouds + rain + lightning bolts, stars dimmed to 35%
This required adding a third canvas layer (weather-canvas) on top of the existing two. The weather layer renders:
- Clouds: Organic shapes made of overlapping radial-gradient "puffs" that drift across the screen
- Fog: Large soft blobs that drift slowly with sine-wave vertical movement
- Rain: Slanted lines that fall and reset, with varying opacity
- Lightning: Procedurally generated branching bolt paths, drawn with a shadow blur for glow, plus a full-screen flash overlay
Each weather's starVisibility value multiplies the star alpha — so in stormy weather, even fully "revealed" stars appear dim because of the cloud cover. This makes weather a meaningful choice, not a decoration: clear weather is best for stargazing, stormy weather is the hardest.
### Change 8: Ambient sound (Web Audio API)
I added a procedurally generated soundscape using the Web Audio API — no external audio files needed. The sound has three layers:
1. Drone pad: Two detuned sine oscillators at 110Hz (A2) through a lowpass filter, with a slow LFO (0.06Hz) modulating the gain for a breathing effect. This creates a warm, continuous low drone.
2. Wind: White noise generated into a 2-second buffer, looped through a bandpass filter at 500Hz. A slow LFO (0.08Hz) sweeps the filter frequency ±300Hz, creating an ever-shifting breeze.
3. Star chimes: When a star is revealed, a sine oscillator plays a note from a C major pentatonic scale (C5, D5, E5, G5, A5, C6). The star's Y position maps to pitch (higher stars = higher notes). Each chime has an ADSR-like envelope with a 2.5-second exponential decay. Chimes are throttled to ~8 per second to avoid clutter.
The master gain starts at 0 and fades to 0.7 over 1.5 seconds when sound is turned on, and fades to 0 over 0.5 seconds when turned off. This avoids sudden audio start/stop. The audio context is created lazily on first toggle (browser autoplay policy requires a user gesture).
The sound toggle button has a pulsing animation when active, and the keyboard shortcut S toggles it.

## User Trial
I asked one person to try the experience before I explained it. Here is what I observed:
- First instinct: They clicked "Look up" and immediately started moving the mouse around on their own — they said they wanted to "see what changes." No hesitation about what to do.
- Core concept: The idea that stars were hidden underneath the light pollution was not instantly obvious. It took a moment for them to realise what was happening, but once they understood, they said it became "very easy to understand." The initial ambiguity wasn't a blocker — it was more like a small "aha" moment.
- Modes: None of the three interaction modes confused them. They tried them and understood the differences without needing explanation.
- Feedback visibility: They did not notice the narrative text appearing on the left side, nor did they register the star counter or sky-cleared percentage. Their attention was entirely on the central canvas where the light and stars were moving.
- Weather: They tried switching between weather conditions and found it "interesting" and "more realistic." They noticed that different weather changed how visible the stars were. This confirmed the weather system reads as a meaningful atmospheric change, not just a colour swap.
- Sound: They did not turn on the sound during the trial. The sound toggle was not discovered on their own.
- Overall feeling: After the trial, they described the experience as "relaxing."
