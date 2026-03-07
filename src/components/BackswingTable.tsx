import { Table } from '@mantine/core';
import type { LagRow } from '../lib/types';
import { fmtInches } from '../lib/zbl';

interface Props {
  lagRows: LagRow[];
  distanceFactor: number;
}

export function BackswingTable({ lagRows, distanceFactor }: Props) {
  const originalRows = lagRows.filter(r => r.original);

  return (
    <div className="quick-table-section">
      <h2 className="section-title">Backswing Reference (Stimp 10)</h2>
      <div className="table-wrapper">
        <Table className="quick-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Distance</Table.Th>
              <Table.Th>Backswing</Table.Th>
              <Table.Th>Landmark</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {originalRows.map(r => {
              const rawDist = parseFloat(r.stimp10.replace(' ft', ''));
              const calDist = Math.round(rawDist / distanceFactor) + ' ft';
              return (
                <Table.Tr key={r.landmark} className="row-original">
                  <Table.Td>{calDist}</Table.Td>
                  <Table.Td>{fmtInches(parseFloat(r.inches.replace('"', '')))}</Table.Td>
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
