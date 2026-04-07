import WidgetKit
import SwiftUI

// ── Timeline entry ────────────────────────────────────────────────────────────

struct BagWidgetEntry: TimelineEntry {
    let date: Date
    let rows: [BagWidgetRow]
}

// ── Provider ──────────────────────────────────────────────────────────────────

struct BagWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> BagWidgetEntry {
        BagWidgetEntry(date: Date(), rows: previewRows)
    }

    func getSnapshot(in context: Context, completion: @escaping (BagWidgetEntry) -> Void) {
        completion(BagWidgetEntry(date: Date(), rows: context.isPreview ? previewRows : loadBagRows()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BagWidgetEntry>) -> Void) {
        let entry   = BagWidgetEntry(date: Date(), rows: loadBagRows())
        let refresh = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(refresh)))
    }
}

// ── Preview data ──────────────────────────────────────────────────────────────

private let previewRows: [BagWidgetRow] = [
    BagWidgetRow(id: "lw",  label: "LW",  fullTotal: 85,  fullCarry: 80,  flightedTotal: 81,  flightedCarry: 76,  isEstimated: true),
    BagWidgetRow(id: "sw",  label: "SW",  fullTotal: 98,  fullCarry: 92,  flightedTotal: 93,  flightedCarry: 87,  isEstimated: true),
    BagWidgetRow(id: "gw",  label: "GW",  fullTotal: 113, fullCarry: 107, flightedTotal: 107, flightedCarry: 102, isEstimated: true),
    BagWidgetRow(id: "pw",  label: "PW",  fullTotal: 125, fullCarry: 118, flightedTotal: 119, flightedCarry: 112, isEstimated: true),
    BagWidgetRow(id: "9i",  label: "9i",  fullTotal: 140, fullCarry: 132, flightedTotal: 133, flightedCarry: 125, isEstimated: true),
    BagWidgetRow(id: "8i",  label: "8i",  fullTotal: 152, fullCarry: 144, flightedTotal: 144, flightedCarry: 137, isEstimated: true),
    BagWidgetRow(id: "7i",  label: "7i",  fullTotal: 165, fullCarry: 156, flightedTotal: 157, flightedCarry: 148, isEstimated: true),
    BagWidgetRow(id: "6i",  label: "6i",  fullTotal: 178, fullCarry: nil, flightedTotal: 169, flightedCarry: nil, isEstimated: true),
    BagWidgetRow(id: "5i",  label: "5i",  fullTotal: 193, fullCarry: nil, flightedTotal: 183, flightedCarry: nil, isEstimated: true),
    BagWidgetRow(id: "3w",  label: "3W",  fullTotal: 235, fullCarry: nil, flightedTotal: nil, flightedCarry: nil, isEstimated: false),
    BagWidgetRow(id: "dr",  label: "DR",  fullTotal: 260, fullCarry: nil, flightedTotal: nil, flightedCarry: nil, isEstimated: false),
]

// ── Shared row view (size-aware) ──────────────────────────────────────────────

struct ClubRowView: View {
    let row: BagWidgetRow
    var fontSize: CGFloat = 13
    var labelWidth: CGFloat = 28
    var showCarry: Bool = false   // show all 4 yardages; false = total + flighted only

    var body: some View {
        HStack(spacing: 3) {
            // Club label
            Text(row.label)
                .font(.system(size: fontSize * 0.82, weight: .semibold))
                .foregroundStyle(.secondary)
                .frame(width: labelWidth, alignment: .leading)
                .lineLimit(1)

            // Full-swing block: total + optional carry
            HStack(spacing: 1) {
                Text("\(row.fullTotal)")
                    .font(.system(size: fontSize, weight: .bold).monospacedDigit())
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                if showCarry, let c = row.fullCarry {
                    Text("/\(c)")
                        .font(.system(size: fontSize * 0.78, weight: .regular).monospacedDigit())
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            .fixedSize()

            // Flighted block: total + optional carry
            if let f = row.flightedTotal {
                HStack(spacing: 1) {
                    Text(row.isEstimated ? "~\(f)" : "\(f)")
                        .font(.system(size: fontSize * 0.88, weight: .medium).monospacedDigit())
                        .foregroundStyle(row.isEstimated ? .tertiary : .secondary)
                        .lineLimit(1)
                    if showCarry, let fc = row.flightedCarry {
                        Text("/\(fc)")
                            .font(.system(size: fontSize * 0.78, weight: .regular).monospacedDigit())
                            .foregroundStyle(.quaternary)
                            .lineLimit(1)
                    }
                }
                .fixedSize()
            }
        }
    }
}

// ── Two-column layout (used by all sizes) ─────────────────────────────────────

struct TwoColumnRows: View {
    let rows: [BagWidgetRow]
    var fontSize: CGFloat = 13
    var spacing: CGFloat = 3
    var showCarry: Bool = false
    var labelWidth: CGFloat = 28

    var body: some View {
        let half  = Int(ceil(Double(rows.count) / 2))
        let left  = Array(rows.prefix(half))
        let right = Array(rows.dropFirst(half))

        HStack(alignment: .top, spacing: 8) {
            VStack(alignment: .leading, spacing: spacing) {
                ForEach(left) { ClubRowView(row: $0, fontSize: fontSize, labelWidth: labelWidth, showCarry: showCarry) }
            }
            Spacer(minLength: 0)
            VStack(alignment: .leading, spacing: spacing) {
                ForEach(right) { ClubRowView(row: $0, fontSize: fontSize, labelWidth: labelWidth, showCarry: showCarry) }
            }
        }
    }
}

// ── Lock screen (accessoryRectangular) ────────────────────────────────────────

struct LockScreenView: View {
    let rows: [BagWidgetRow]

    var body: some View {
        TwoColumnRows(rows: rows, fontSize: 8, spacing: 0, showCarry: false, labelWidth: 20)
            .padding(.horizontal, 2)
            .padding(.vertical, 1)
            .containerBackground(.fill.tertiary, for: .widget)
    }
}

// ── Small home screen ─────────────────────────────────────────────────────────

struct SmallView: View {
    let rows: [BagWidgetRow]

    var body: some View {
        // Show top 8 clubs (most-used: wedges + mid irons)
        let displayed = Array(rows.prefix(8))
        TwoColumnRows(rows: displayed, fontSize: 13, spacing: 3)
            .padding(10)
            .containerBackground(.fill.tertiary, for: .widget)
    }
}

// ── Medium home screen ────────────────────────────────────────────────────────

struct MediumView: View {
    let rows: [BagWidgetRow]

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("My Clubs")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.secondary)
                .padding(.bottom, 1)
            TwoColumnRows(rows: rows, fontSize: 15, spacing: 5)
            Spacer(minLength: 0)
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// ── Large home screen ─────────────────────────────────────────────────────────

struct LargeView: View {
    let rows: [BagWidgetRow]

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("My Clubs")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(.secondary)
                .padding(.bottom, 2)
            TwoColumnRows(rows: rows, fontSize: 13, spacing: 5, showCarry: true)
            Spacer(minLength: 0)
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// ── Empty state ───────────────────────────────────────────────────────────────

struct BagWidgetEmptyView: View {
    var body: some View {
        VStack(spacing: 4) {
            Text("My Clubs")
                .font(.system(size: 12, weight: .bold))
            Text("Open ZeroBreak to\nenter your yardages")
                .font(.system(size: 10))
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// ── Entry view (dispatches by family) ─────────────────────────────────────────

struct BagWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: BagWidgetEntry

    var body: some View {
        switch family {
        case .accessoryRectangular:
            LockScreenView(rows: entry.rows)
        case .systemSmall:
            SmallView(rows: entry.rows)
        case .systemMedium:
            MediumView(rows: entry.rows)
        case .systemLarge:
            LargeView(rows: entry.rows)
        default:
            MediumView(rows: entry.rows)
        }
    }
}

// ── Widget ────────────────────────────────────────────────────────────────────

struct BagWidget: Widget {
    let kind = "BagWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BagWidgetProvider()) { entry in
            if entry.rows.isEmpty {
                BagWidgetEmptyView()
            } else {
                BagWidgetEntryView(entry: entry)
            }
        }
        .configurationDisplayName("My Clubs")
        .description("Your full bag yardage reference.")
        .supportedFamilies([.accessoryRectangular, .systemSmall, .systemMedium, .systemLarge])
    }
}

// ── Widget bundle (app entry point) ──────────────────────────────────────────

@main
struct BagWidgetBundle: WidgetBundle {
    var body: some Widget {
        BagWidget()
    }
}

// ── Previews ──────────────────────────────────────────────────────────────────

#if compiler(>=5.9)
@available(iOS 17.0, *)
#Preview(as: .systemLarge) {
    BagWidget()
} timeline: {
    BagWidgetEntry(date: Date(), rows: previewRows)
}
#endif
