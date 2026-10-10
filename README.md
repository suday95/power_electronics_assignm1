# RectifierLab – Power Electronics Virtual Laboratory

Interactive simulator for single-phase and three-phase, half-wave and full-bridge diode / thyristor rectifiers
(R, RL and RLE loads, optional freewheeling diode, per-device diode/thyristor selection, semi-converters).

```bash
npm install
npm run dev            # http://localhost:3000
npm run build          # production build
npm run lint           # type-check
npm run check:engine   # 185 numeric checks of the simulator against closed-form results
```

## How it works

`src/engine/simulationMath.ts` is a time-domain simulator with ideal switches and instantaneous commutation.
Devices are split into a *top* group (highest anode conducts) and a *bottom* group (lowest cathode conducts).
A state machine decides which devices conduct, when the freewheeling diode takes over and when the load current
reaches zero; the load current comes from an exact exponential integrator of `L·di/dt = v_o − E − R·i`, iterated
to periodic steady state (so continuous and discontinuous conduction both appear naturally).
Thyristor gates are held until the device fires (continuous gating).

All metrics (V_dc, V_rms, ripple factor, efficiency η = P_dc/P_ac, THD, PF, DPF) are computed from the simulated
waveforms; the closed-form V_dc shown next to them is only displayed where a formula applies.
The 3Φ supply voltage is the line-to-line RMS value.

## Features
Schematic with live current flow and clickable switches · oscilloscope (superimposed, multi-channel, FFT) with probe,
gate-pulse row and conduction timeline · metrics + formula check · presets · lab manual, observation table (CSV export)
and viva quiz · light/dark theme · keyboard shortcuts (Space = run/pause, ← → = step 1°).
