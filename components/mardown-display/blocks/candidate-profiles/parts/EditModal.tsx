// EditModal.jsx
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
  } from "@/components/ui/dialog";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Button } from "@/components/ui/button";
  import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
  
  // Props interface
  type EditModalProps = {
    isOpen: boolean;
    onClose: () => void;
    editType: "section" | "experience" | "item";
    editAction: "edit" | "add";
    editTitle: string;
    editValue: string;
    editCompany: string;
    editSectionType: "experience" | "text" | "keyValue";
    setEditTitle: (value: string) => void;
    setEditValue: (value: string) => void;
    setEditCompany: (value: string) => void;
    setEditSectionType: (value: "experience" | "text" | "keyValue") => void;
    onSave: () => void;
  };
  
  const EditModal = ({
    isOpen,
    onClose,
    editType,
    editAction,
    editTitle,
    editValue,
    editCompany,
    editSectionType,
    setEditTitle,
    setEditValue,
    setEditCompany,
    setEditSectionType,
    onSave,
  }: EditModalProps) => {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editAction === "edit" ? "Edit" : "Add"}{" "}
              {editType === "section" ? "Section" : editType === "experience" ? "Experience" : "Item"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Section editing */}
            {editType === "section" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="section-title">Section Title</Label>
                  <Input
                    id="section-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Enter section title"
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Section Type</Label>
                  <RadioGroup
                    value={editSectionType}
                    onValueChange={(value) => 
                      setEditSectionType(value as "experience" | "text" | "keyValue")
                    }
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="text" id="type-text" />
                      <Label htmlFor="type-text">Text</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="experience" id="type-experience" />
                      <Label htmlFor="type-experience">Experience</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="keyValue" id="type-keyValue" />
                      <Label htmlFor="type-keyValue">Key-Value</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="section-content">Content (Optional)</Label>
                  <Textarea
                    id="section-content"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="Enter section content"
                    rows={3}
                    className="resize-y"
                  />
                </div>
              </>
            )}
            
            {/* Experience editing */}
            {editType === "experience" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="experience-company">Company</Label>
                  <Input
                    id="experience-company"
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    placeholder="Enter company name"
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="experience-title">Title/Position</Label>
                  <Input
                    id="experience-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Enter job title"
                    className="w-full"
                  />
                </div>
              </>
            )}
            
            {/* Item editing */}
            {editType === "item" && (
              <div className="space-y-2">
                <Label htmlFor="item-content">Content</Label>
                <Textarea
                  id="item-content"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter item content"
                  rows={4}
                  className="resize-y"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use ** around text to highlight important information. Example: This is **highlighted** text.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" onClick={onClose} className="mr-2">
              Cancel
            </Button>
            <Button onClick={onSave}>
              {editAction === "edit" ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  export default EditModal;