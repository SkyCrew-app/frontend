import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from 'lucide-react';

interface CourseSearchProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  category: string;
  setCategory: (category: string) => void;
}

export function CourseSearch({ searchTerm, setSearchTerm, category, setCategory }: CourseSearchProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Input
          type="text"
          placeholder="Rechercher un cours..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow"
        />
        <Button size="icon" variant="secondary">
          <Search className="h-4 w-4" />
        </Button>
      </div>
      <Select
        value={category}
        onValueChange={setCategory}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Toutes les catégories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les catégories</SelectItem>
          <SelectItem value="PPL">PPL</SelectItem>
          <SelectItem value="CPL">CPL</SelectItem>
          <SelectItem value="ATPL">ATPL</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
