## STARGAZE — Reveal the Hidden Sky
An interactive experience about light pollution. A layer of glowing particles represents the city's light pollution — a veil that hides the night sky. Move your cursor to part the light, revealing the stars beneath. Click to scatter it. Watch shooting stars drift by. Switch between four weather conditions — clear, cloudy, foggy, stormy — each transforming the sky's atmosphere. Turn on the ambient soundscape for a procedurally generated drone that deepens the meditative mood. As you reveal more of the sky, narrative fragments appear — reminders of what we've lost to light pollution.
No frameworks. No dependencies. No audio files. Pure HTML5 Canvas, vanilla JavaScript, and the Web Audio API.

## The idea
STARGAZE is for anyone who has looked up at a dull orange city sky and wondered: what would this look like without the light? It's a small, meditative experience that turns that question into something you can touch — move your cursor, part the glow, and watch the stars emerge.
The core interaction loop:
1. Input — The user moves the cursor through the light pollution layer, clicks to send shockwaves that scatter the light, switches interaction modes (Part, Gather, Storm), changes weather conditions, and optionally toggles ambient sound.
2. Response — Light particles are physically pushed away from the cursor, fading as they disperse. Stars beneath are gradually revealed — they twinkle into existence as the light recedes. Weather adds visual atmosphere: drifting clouds, fog, rain, and lightning. A gentle chime sounds as each star emerges.
3. Feedback — A live counter shows how many stars you've revealed and what percentage of the sky is clear. Narrative messages appear at milestones: "80% of the world lives under a light-polluted sky…" A "Wish" button sends a meteor across the sky.

## Intended user
Anyone who wants a moment of quiet wonder — a student taking a break, a city dweller who misses dark skies, or someone curious about light pollution. No instructions needed: the interaction is immediately intuitive.

## Features
Three-layer canvas system
- Background layer: 400 twinkling stars (some with diffraction spikes), drifting nebula clouds, and random meteors — the hidden beauty beneath the light.
- Foreground layer: Glowing light pollution particles that obscure the sky. They respond to mouse movement with physics (velocity, damping, boundary wrapping).
- Weather layer: Clouds, fog, rain drops, and lightning bolts — overlay effects that transform the sky's atmosphere.

## Weather system
Four weather conditions, each changing the sky's mood and star visibility:
| Weather | Visual effects | Star visibility |
| :--- | :--- | :--- |
| **Clear** | Deep black-blue sky, full star visibility | 100% |
| **Cloudy** | 5 drifting cloud formations, slightly dimmed stars | 75% |
| **Foggy** | 4 drifting fog blobs + 2 clouds, stars significantly dimmed | 50% |
| **Stormy** | 8 heavy clouds + rain + lightning bolts + fog, stars barely visible | 35% |

Weather isn't just decorative — it changes how difficult it is to see the stars even after parting the light pollution. Stormy weather creates a double challenge: you must clear the city light and contend with the storm.

## Ambient sound (Web Audio API)
A procedurally generated soundscape — no audio files needed:
- Drone pad: Two detuned sine oscillators (110Hz) through a lowpass filter, with a slow LFO modulating the gain for a breathing effect.
- Wind: White noise through a bandpass filter with a slow LFO sweeping the filter frequency — a gentle, ever-shifting breeze.
- Star chimes: When a star is revealed, a sine wave plays a note from a pentatonic scale (C major pentatonic, C5–C6). Higher stars play higher notes. Chimes are throttled to ~8 per second to avoid clutter.
- Toggle: Click the sound icon in the control panel or press S. The master gain fades in/out smoothly over 1.5 seconds.

## Three interaction modes
