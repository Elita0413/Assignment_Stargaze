# STARGAZE — Reveal the Hidden Sky
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

### Weather system
Four weather conditions, each changing the sky's mood and star visibility:
| Weather | Visual effects | Star visibility |
| :--- | :--- | :--- |
| **Clear** | Deep black-blue sky, full star visibility | 100% |
| **Cloudy** | 5 drifting cloud formations, slightly dimmed stars | 75% |
| **Foggy** | 4 drifting fog blobs + 2 clouds, stars significantly dimmed | 50% |
| **Stormy** | 8 heavy clouds + rain + lightning bolts + fog, stars barely visible | 35% |

Weather isn't just decorative — it changes how difficult it is to see the stars even after parting the light pollution. Stormy weather creates a double challenge: you must clear the city light and contend with the storm.

### Ambient sound (Web Audio API)
A procedurally generated soundscape — no audio files needed:
- Drone pad: Two detuned sine oscillators (110Hz) through a lowpass filter, with a slow LFO modulating the gain for a breathing effect.
- Wind: White noise through a bandpass filter with a slow LFO sweeping the filter frequency — a gentle, ever-shifting breeze.
- Star chimes: When a star is revealed, a sine wave plays a note from a pentatonic scale (C major pentatonic, C5–C6). Higher stars play higher notes. Chimes are throttled to ~8 per second to avoid clutter.
- Toggle: Click the sound icon in the control panel or press S. The master gain fades in/out smoothly over 1.5 seconds.

### Three interaction modes
| Mode | What happens |
| :--- | :--- |
| **Part** | Light particles are pushed away from the cursor, revealing stars beneath. The default "parting the veil" interaction.|
| **Gather** | Light particles gather toward the cursor, creating a dense glow. The opposite effect — you're collecting the light.|
| **Storm** |	Chaotic scattering — particles fly in random directions. Aggressive clearing.|

### Star revelation system
Stars have a revealAlpha that smoothly transitions between hidden and visible. When light particles near a star disperse (their combined opacity drops below a threshold), the star fades in. When light returns, the star fades out. This creates a living, breathing relationship between the two layers.

### Diffraction spikes
Brighter stars (~8% of all stars) display cross-shaped diffraction spikes — the visual effect you see in telescope photographs. This adds a touch of astronomical realism.

### Narrative system
As the user reveals more stars, short italic messages appear on the left side of the screen at thresholds (5%, 15%, 30%, 50%, 70% cleared):
- "80% of the world lives under a light-polluted sky…"
- "A child born today may never see the Milky Way."
- "Light pollution grows 2% every year. The stars retreat."
- "In a truly dark sky, you'd see 2,500 stars. How many can you find?"
- "Every star was always there. We just forgot to look up."

### Shooting stars (meteors)
- Random meteors occasionally streak across the sky (low probability, max 2 at a time).
- The Wish button lets the user manually trigger a meteor — a playful nod to the tradition of making a wish on a shooting star.

### Technical highlights
- Three <canvas> layers with independent rendering — background (stars/nebula/meteors), foreground (light pollution), and weather (clouds/fog/rain/lightning)
- destination-out compositing on the foreground canvas for motion-blur trails
- globalCompositeOperation = 'lighter' for additive glow on background and foreground layers
- Web Audio API: detuned oscillators, filtered noise, LFO modulation, per-star chime synthesis
- DevicePixelRatio-aware for retina displays
- Bounded arrays (shockwaves max 12, meteors max 2, lightning bolts auto-expire) — handles repeated interaction without memory issues
- Touch support for mobile
- prefers-reduced-motion support
- Keyboard shortcuts: 1–3 for modes, R to restore light, W for a wish, S to toggle sound, Space for shockwave

## How to run
### Option 1: Open the file
Open index.html in any modern browser (Chrome, Firefox, Safari, Edge).
### Option 2: Serve locally
python3 -m http.server 8000
Then visit http://localhost:8000.

## Known limitations
- Performance depends on light density and screen size. With 600 particles on a large display, the per-frame star-light proximity check may drop below 60fps. Reduce density if needed.
- The star revelation check is O(stars × nearby light particles). It uses early-exit optimisation but is not spatially indexed — a known trade-off for code clarity.
- Stars only reveal when light particles near them disperse. If you clear light from one side of the screen, stars on the other side remain hidden until you clear there too.
- Weather affects star visibility multiplicatively — in stormy weather, even fully "revealed" stars appear dim because of the cloud cover. This is intentional (the weather is part of the challenge) but may surprise users expecting full brightness.
- Audio requires a user gesture to start (browser autoplay policy). Click the sound icon or press S after entering the experience.
- No persistence — refreshing resets the experience. This is intentional: each session is a fresh encounter with the veil.

## Screenshot
<img width="1512" height="982" alt="截屏2026-10-29 11 15 20" src="https://github.com/user-attachments/assets/beeb2a1c-6664-4bf0-8c4b-1aadd8b96a9e" />

## Credits
- Light pollution statistics in the narrative messages are approximate, drawn from widely cited sources: the 2016 "World Atlas of Artificial Night Sky Brightness" (Falchi et al.) and the International Dark-Sky Association.
- Diffraction spike rendering is inspired by the visual effect seen in long-exposure astrophotography.
- Ambient sound is synthesised entirely with the Web Audio API — no external audio files. The pentatonic chime approach is a common technique in generative music.
- Fonts: Cormorant Garamond by Christian Thalmann (display) and Space Grotesk by Florian Karsten (UI), via Google Fonts.
- Weather icons in the control panel are simple inline SVG, drawn by hand for this project.
- All code is original for this assignment. No course examples were extended.
