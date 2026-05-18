# Changelog - Global Parts Technology Roadmap

## [v1.2.0-enterprise] - 2026-05-18

### Added
- **Executive Hero**: Premium glassmorphism header for the main Dashboard.
- **Insight Cards**: 4 premium KPI cards combining `framer-motion` and strategic data aggregation, replacing the generic 12 cards.
- **Timeline Presentation Mode**: Full-fledged Executive presentation layout for Roadmap projects with context-aware metrics and strategic justification.
- **Custom Tooltips**: Created `<CustomTooltip>` for Recharts integrating backdrop blur, border radiuses, and uppercase strategic typography.
- **Gantt Tooltips Context**: The hover popover on the timeline now presents an interactive view with remaining days for EOL, recommended start dates, and projected costs.

### Changed
- **Gantt View**: Height properties reduced (`h-24` to `h-20` and bars `h-12` to `h-10`) to eliminate excess whitespace and support higher information density on executive screens.
- **Charts Styling**: Integrated `<linearGradient>` to fill bar and area charts for a premium feel.
- **Typography and Aesthetics**: Adopted tracking-widest, uppercase indicators, and soft glows/drop-shadows indicating project health (Red for Critical, Green for Stable).

### Fixed
- **Strict TypeScript Compliance**: Eradicated remaining typing errors in the UX module (`Map` vs `lucide-react Map`, invalid Recharts SVG imports like `defs`, and missing `lucide-react` imports).

### Frozen
- **Dashboard UX Frozen**: Dashboard modules are now completely locked against visual changes.
- **Timeline UX Frozen**: RoadmapTimeline and Gantt modules are locked. 
