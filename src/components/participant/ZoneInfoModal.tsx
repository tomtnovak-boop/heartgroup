import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ZoneInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ZoneInfoModal({ open, onOpenChange }: ZoneInfoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How we calculate your zones</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <section>
            <h3 className="font-semibold text-base mb-1">Maximum Heart Rate</h3>
            <p className="text-muted-foreground mb-1">
              Formula: <span className="font-mono text-foreground">208 − 0.7 × age</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Source: Tanaka et al., 2001 — more accurate than the older 220 − age formula.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">Heart Rate Zones</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 px-2">Zone</TableHead>
                  <TableHead className="h-8 px-2">Name</TableHead>
                  <TableHead className="h-8 px-2">Range</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { zone: 'Z1', name: 'Recovery', range: '0 – 60% Max HR' },
                  { zone: 'Z2', name: 'Fat Burn', range: '60 – 70% Max HR' },
                  { zone: 'Z3', name: 'Aerobic', range: '70 – 80% Max HR' },
                  { zone: 'Z4', name: 'Anaerobic', range: '80 – 90% Max HR' },
                  { zone: 'Z5', name: 'Max', range: '90 – 100% Max HR' },
                ].map((z) => (
                  <TableRow key={z.zone}>
                    <TableCell className="py-1.5 px-2 font-medium">{z.zone}</TableCell>
                    <TableCell className="py-1.5 px-2">{z.name}</TableCell>
                    <TableCell className="py-1.5 px-2">{z.range}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-1">Calorie Calculation</h3>
            <p className="text-muted-foreground mb-1">
              Formula:{' '}
              <span className="font-mono text-foreground text-xs">
                (0.6309 × HR − 55.0969 + 0.1988 × weight + 0.2017 × age) / 4.184
              </span>
            </p>
            <p className="text-xs text-muted-foreground mb-1">
              Source: Keytel et al., 2005
            </p>
            <p className="text-xs text-muted-foreground">
              Note: If no weight is stored in your profile, we use a default of 75 kg.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
