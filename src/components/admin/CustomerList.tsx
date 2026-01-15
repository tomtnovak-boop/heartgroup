import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CustomerEditDialog } from './CustomerEditDialog';
import { Edit, Search, Users, Loader2 } from 'lucide-react';

interface CustomerProfile {
  id: string;
  name: string;
  age: number;
  max_hr: number;
  custom_max_hr?: number | null;
  user_id?: string | null;
}

export function CustomerList() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<CustomerProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchCustomers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching customers:', error);
      setIsLoading(false);
      return;
    }

    setCustomers(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleEdit = (customer: CustomerProfile) => {
    setEditingCustomer(customer);
    setIsEditDialogOpen(true);
  };

  const handleCustomerUpdated = () => {
    fetchCustomers();
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Kunden suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customer Table */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Keine Kunden gefunden</h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'Versuche einen anderen Suchbegriff.' : 'Es sind noch keine Teilnehmer registriert.'}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Alter</TableHead>
                <TableHead className="text-center">HFmax</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="text-center">{customer.age} Jahre</TableCell>
                  <TableCell className="text-center">
                    {customer.custom_max_hr || customer.max_hr} bpm
                    {customer.custom_max_hr && (
                      <span className="ml-1 text-xs text-muted-foreground">(individuell)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(customer)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Bearbeiten
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <CustomerEditDialog
        customer={editingCustomer}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onCustomerUpdated={handleCustomerUpdated}
      />
    </div>
  );
}
