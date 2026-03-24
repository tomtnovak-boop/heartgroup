import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CustomerEditDialog } from './CustomerEditDialog';
import { Edit, Search, Users, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CustomerProfile {
  id: string;
  name: string;
  nickname?: string | null;
  age: number;
  max_hr: number;
  custom_max_hr?: number | null;
  weight?: number | null;
  height?: number | null;
  user_id?: string | null;
}

export function CustomerList() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<CustomerProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const fetchCustomers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('name');
    if (error) { console.error('Error fetching customers:', error); setIsLoading(false); return; }
    setCustomers(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleEdit = (customer: CustomerProfile) => { setEditingCustomer(customer); setIsEditDialogOpen(true); };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    setIsDeleting(true);
    const { data, error } = await supabase.functions.invoke('manage-coach', {
      body: { action: 'deleteParticipant', profile_id: deletingCustomer.id, user_id: deletingCustomer.user_id || null },
    });
    setIsDeleting(false);
    if (error || data?.error) {
      toast({ title: 'Error deleting', description: data?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Participant deleted', description: `${deletingCustomer.name} has been removed.` });
    setDeletingCustomer(null);
    fetchCustomers();
  };

  const filteredCustomers = customers.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search customers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No customers found</h3>
          <p className="text-muted-foreground">{searchTerm ? 'Try a different search term.' : 'No participants registered yet.'}</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Nickname</TableHead>
                <TableHead className="text-center">Age</TableHead>
                <TableHead className="text-center">Weight</TableHead>
                <TableHead className="text-center">Height</TableHead>
                <TableHead className="text-center">Max HR</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="text-muted-foreground">{customer.nickname || '–'}</TableCell>
                  <TableCell className="text-center">{customer.age} yrs</TableCell>
                  <TableCell className="text-center">{customer.weight ? `${customer.weight} kg` : '–'}</TableCell>
                  <TableCell className="text-center">{customer.height ? `${customer.height} cm` : '–'}</TableCell>
                  <TableCell className="text-center">
                    {customer.custom_max_hr || customer.max_hr} bpm
                    {customer.custom_max_hr && <span className="ml-1 text-xs text-muted-foreground">(custom)</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)}><Edit className="w-4 h-4 mr-1" />Edit</Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeletingCustomer(customer)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CustomerEditDialog customer={editingCustomer} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} onCustomerUpdated={fetchCustomers} />

      <AlertDialog open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Participant</AlertDialogTitle>
            <AlertDialogDescription>
              Delete participant <strong>{deletingCustomer?.name}</strong>? This action cannot be undone. All training data will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
