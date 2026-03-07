import { Table } from '@mantine/core';
import { fmtInches } from '../lib/zbl';
import { getDistanceForStimp } from '../lib/backswing';
import type { LagRow } from '../lib/types';

// Extended backswing inches included beyond the core "original" set
const EXTENDED_INCHES = [24, 27, 30]; // 9", 12", 15" past outside trail foot

interface BackswingTableProps {
  lagRows: LagRow[];
  distanceFactor: number;
  stimp: number;
}

export default function BackswingTable({ lagRows, distanceFactor, stimp }: BackswingTableProps) {
  const rows = lagRows.filter(r =>
    r.original || EXTENDED_INCHES.includes(parseFloat(r.inches.replace('"', ''))),
  );

  return (
    <div className="quick-table-section">
      <h2 className="section-title">Backswing Reference (Stimp {stimp})</h2>
      <div className="table-wrapper">
        <Table classNames={{ table: 'quick-table' }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Distance</Table.Th>
              <Table.Th>Backswing</Table.Th>
              <Table.Th>Landmark</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r, i) => {
              const rawDist   = getDistanceForStimp(r, stimp);
              const calDist   = Math.round(rawDist / distanceFactor);
              const rawInches = parseFloat(r.inches.replace('"', ''));
              return (
                <Table.Tr key={i} className="row-original">
                  <Table.Td>{calDist} ft</Table.Td>
                  <Table.Td>{fmtInches(rawInches)}</Table.Td>
                  <Table.Td>{r.landmark}</Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </div>
    </div>
  );
}
