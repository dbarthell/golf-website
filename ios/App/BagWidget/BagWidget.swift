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
        // Refresh once an hour in case data changed while the app ran
        let refresh = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(refresh)))
    }
}

// ── Preview data ──────────────────────────────────────────────────────────────

private let previewRows: [BagWidgetRow] = [
    BagWidgetRow(id: "lw",  label: "LW",  fullTotal: 85,  flightedTotal: 81,  isEstimated: true),
    BagWidgetRow(id: "sw",  label: "SW",  fullTotal: 98,  flightedTotal: 93,  isEstimated: true),
    BagWidgetRow(id: "gw",  label: "GW",  fullTotal: 113, flightedTotal: 107, isEstimated: true),
    BagWidgetRow(id: "pw",  label: "PW",  fullTotal: 125, flightedTotal: 119, isEstimated: true),
    BagWidgetRow(id: "9i",  label: "9i",  fullTotal: 140, flightedTotal: 133, isEstimated: true),
    BagWidgetRow(id: "8i",  label: "8i",  fullTotal: 152, flightedTotal: 144, isEstimated: true),
    BagWidgetRow(id: "7i",  label: "7i",  fullTotal: 165, flightedTotal: 157, isEstimated: true),
    BagWidgetRow(id: "6i",  label: "6i",  fullTotal: 178, flightedTotal: nil, isEstimated: false),
    BagWidgetRow(id: "5i",  label: "5i",  fullTotal: 193, flightedTotal: nil, isEstimated: false),
    BagWidgetRow(id: "3w",  label: "3W",  fullTotal: 235, flightedTotal: nil, isEstimated: false),
    BagWidgetRow(id: "dr",  label: "DR",  fullTotal: 260, flightedTotal: nil, isEstimated: false),
]

// ── Single club row view ──────────────────────────────────────────────────────

struct ClubRowView: View {
    let row: BagWidgetRow

    var body: some View {
        HStack(spacing: 3) {
            Text(row.label)
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(.secondary)
                .frame(width: 24, alignment: .leading)

            Text("\(row.fullTotal)")
                .font(.system(size: 11, weight: .bold).monospacedDigit())
                .foregroundStyle(.primary)

            if let f = row.flightedTotal {
                Text(row.isEstimated ? "~\(f)" : "\(f)")
                    .font(.system(size: 10, weight: .medium).monospacedDigit())
                    .foregroundStyle(row.isEstimated ? .tertiary : .secondary)
            }
        }
    }
}

// ── Main widget view ──────────────────────────────────────────────────────────

struct BagWidgetEntryView: View {
    var entry: BagWidgetEntry

    var body: some View {
        let rows  = entry.rows
        let half  = Int(ceil(Double(rows.count) / 2))
        let left  = Array(rows.prefix(half))
        let right = Array(rows.dropFirst(half))

        HStack(alignment: .top, spacing: 8) {
            VStack(alignment: .leading, spacing: 2) {
                ForEach(left) { ClubRowView(row: $0) }
            }
            Spacer(minLength: 0)
            VStack(alignment: .leading, spacing: 2) {
                ForEach(right) { ClubRowView(row: $0) }
            }
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 2)
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
        .supportedFamilies([.accessoryRectangular])
    }
}

// ── Preview ───────────────────────────────────────────────────────────────────

#Preview(as: .accessoryRectangular) {
    BagWidget()
} timeline: {
    BagWidgetEntry(date: Date(), rows: previewRows)
}
