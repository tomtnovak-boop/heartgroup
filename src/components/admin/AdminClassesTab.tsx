import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ClassType {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
}

export function AdminClassesTab() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<ClassType | null>(null);
  const [deleting, setDeleting] = useState<ClassType | null>(null);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isSaving, setIsSaving] = useState(false);

  const fetchClasses = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('class_types').select('*').order('sort_order').order('name');
    if (error) toast({ title: 'Could not load classes', description: error.message, variant: 'destructive' });
    setClasses(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchClasses(); }, []);

  const openCreate = () => {
    setEditing({ id: '', name: '', sort_order: classes.length, active: true });
    setName('');
    setSortOrder(String(classes.length));
  };

  const openEdit = (item: ClassType) => {
    setEditing(item);
    setName(item.name);
    setSortOrder(String(item.sort_order));
  };

  const saveClass = async () => {
    if (!name.trim()) {
      toast({ title: 'Class name is required', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    const values = { name: name.trim(), sort_order: Number.parseInt(sortOrder, 10) || 0 };
    const { error } = editing?.id
      ? await supabase.from('class_types').update(values).eq('id', editing.id)
      : await supabase.from('class_types').insert(values);
    setIsSaving(false);
    if (error) {
      toast({ title: 'Could not save class', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing?.id ? 'Class updated' : 'Class added' });
    setEditing(null);
    fetchClasses();
  };

  const toggleActive = async (item: ClassType) => {
    const { error } = await supabase.from('class_types').update({ active: !item.active }).eq('id', item.id);
    if (error) {
      toast({ title: 'Could not update class', description: error.message, variant: 'destructive' });
      return;
    }
    fetchClasses();
  };

  const deleteClass = async () => {
    if (!deleting) return;
    const { error } = await supabase.from('class_types').delete().eq('id', deleting.id);
    if (error) {
      toast({ title: 'Could not delete class', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Class deleted' });
    setDeleting(null);
    fetchClasses();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Classes <span className="font-normal text-muted-foreground">({classes.length})</span></h2>
        <Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Add Class</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : classes.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No classes available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr className="border-b border-border">
              {['Class', 'Sort Order', 'Active', 'Actions'].map(heading => (
                <th key={heading} className="bg-card px-4 py-3 text-left text-xs font-bold uppercase text-muted-foreground">{heading}</th>
              ))}
            </tr></thead>
            <tbody>{classes.map(item => (
              <tr key={item.id} className="border-b border-border">
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{item.sort_order}</td>
                <td className="px-4 py-3"><Switch checked={item.active} onCheckedChange={() => toggleActive(item)} aria-label={`Set ${item.name} ${item.active ? 'inactive' : 'active'}`} /></td>
                <td className="px-4 py-3"><div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="Edit class"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleting(item)} title="Delete class"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit Class' : 'Add Class'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label htmlFor="class-name">Class Name</Label><Input id="class-name" value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Spinning" /></div>
            <div className="space-y-1.5"><Label htmlFor="class-order">Sort Order</Label><Input id="class-order" type="number" value={sortOrder} onChange={event => setSortOrder(event.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveClass} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={open => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. Existing workout snapshots will keep the class name.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={deleteClass}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}