'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Plus, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  GripVertical,
  X,
  Save,
  Loader2,
  ArrowLeft,
  Trash2,
  FileText,
  MessageSquare,
  Zap,
  GitBranch,
  StickyNote,
  ChevronDown,
  Copy,
  Table2,
  PlusCircle,
  MinusCircle,
  WrapText,
  ExternalLink,
  Focus,
  AlertCircle,
  Pencil,
  Link2,
  MoreVertical,
  FolderOpen,
  FolderPlus,
  MoveHorizontal,
  ChevronRight,
  Home
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';

// Types
interface Position {
  x: number;
  y: number;
}

type NodeType = 'whatsapp' | 'event' | 'logic' | 'sticky' | 'table' | 'journey';

interface Size {
  width: number;
  height: number;
}

interface BaseNode {
  id: string;
  type: NodeType;
  position: Position;
  size?: Size;
  outputs: string[];
}

interface WhatsAppNode extends BaseNode {
  type: 'whatsapp';
  data: {
    message: string;
    templateName?: string;
  };
}

interface EventNode extends BaseNode {
  type: 'event';
  data: {
    eventType: string;
    description: string;
  };
}

interface LogicNode extends BaseNode {
  type: 'logic';
  data: {
    condition: string;
    description: string;
  };
}

interface StickyNode extends BaseNode {
  type: 'sticky';
  data: {
    content: string;
    color: string;
  };
}

interface TableNode extends BaseNode {
  type: 'table';
  data: {
    headers: string[];
    rows: string[][];
    textWrap?: boolean;
    columnWidths?: number[]; // Width percentages for each column
  };
}

interface JourneyLinkNode extends BaseNode {
  type: 'journey';
  data: {
    targetJourneyId: string | null;
    targetJourneyName: string | null;
    description: string;
  };
}

type JourneyNode = WhatsAppNode | EventNode | LogicNode | StickyNode | TableNode | JourneyLinkNode;

interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
}

interface Journey {
  id: string;
  name: string;
  description: string | null;
  group_id: string | null;
  nodes: JourneyNode[];
  connections: Connection[];
  canvas_state: { zoom: number; panX: number; panY: number } | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface JourneyGroup {
  id: string;
  client_id: string;
  parent_group_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Generate unique IDs
const generateId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Highlight variables in text ({{variable}})
const highlightVariables = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, index) => {
    if (part.match(/^\{\{[^}]+\}\}$/)) {
      return (
        <span 
          key={index} 
          className="bg-[#DBEAFE] text-[#1E3A8A] px-1 rounded font-mono text-xs font-semibold"
          style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
        >
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

// Variable-aware textarea component
const VariableTextarea = ({ 
  value, 
  onChange, 
  placeholder, 
  className,
  style,
}: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}) => {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Highlight overlay - shows the formatted text with variables highlighted */}
      <div 
        className={`absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden ${className}`}
        style={{ 
          ...style, 
          padding: style?.padding || 'inherit',
          margin: 0,
          border: 'none',
          outline: 'none'
        }}
        aria-hidden="true"
      >
        {value ? highlightVariables(value) : (placeholder ? <span className="opacity-50">{placeholder}</span> : null)}
      </div>
      {/* Actual textarea - text is transparent, only caret is visible */}
      <textarea
        value={value}
        onChange={onChange}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className={`relative w-full h-full bg-transparent resize-none focus:outline-none overflow-hidden ${className}`}
        style={{ 
          ...style, 
          color: 'transparent',
          caretColor: style?.color || 'black',
          padding: style?.padding || 'inherit',
          margin: 0,
          border: 'none',
          outline: 'none'
        }}
        placeholder=""
      />
    </div>
  );
};

// Variable-aware input component  
const VariableInput = ({ 
  value, 
  onChange, 
  placeholder, 
  className,
}: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}) => {
  return (
    <div className="relative w-full">
      {/* Highlight overlay */}
      <div 
        className={`absolute inset-0 pointer-events-none whitespace-nowrap overflow-hidden flex items-center ${className}`}
        style={{ 
          padding: 'inherit',
          margin: 0,
          border: 'none',
          outline: 'none'
        }}
        aria-hidden="true"
      >
        {value ? highlightVariables(value) : (placeholder ? <span className="opacity-50">{placeholder}</span> : null)}
      </div>
      {/* Actual input - text is transparent, only caret is visible */}
      <input
        type="text"
        value={value}
        onChange={onChange}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className={`relative w-full bg-transparent focus:outline-none ${className}`}
        style={{ 
          color: 'transparent',
          caretColor: 'black'
        }}
        placeholder=""
      />
    </div>
  );
};

// Node colors/styles
const NODE_STYLES = {
  whatsapp: {
    bg: '#25D366',
    bgLight: '#DCF8C6',
    border: '#128C7E',
    icon: MessageSquare,
    label: 'WhatsApp',
  },
  event: {
    bg: '#8B5CF6',
    bgLight: '#EDE9FE',
    border: '#7C3AED',
    icon: Zap,
    label: 'Event',
  },
  logic: {
    bg: '#3B82F6',
    bgLight: '#DBEAFE',
    border: '#2563EB',
    icon: GitBranch,
    label: 'Logic',
  },
  sticky: {
    bg: '#FEF08A',
    bgLight: '#FEF9C3',
    border: '#EAB308',
    icon: StickyNote,
    label: 'Sticky Note',
  },
  table: {
    bg: '#06B6D4',
    bgLight: '#CFFAFE',
    border: '#0891B2',
    icon: Table2,
    label: 'Table',
  },
  journey: {
    bg: '#F97316',
    bgLight: '#FFEDD5',
    border: '#EA580C',
    icon: Link2,
    label: 'Journey Link',
  },
};

const STICKY_COLORS = ['#FEF08A', '#FECACA', '#BBF7D0', '#BFDBFE', '#E9D5FF', '#FED7AA'];

// Default node sizes
const DEFAULT_SIZES: Record<string, Size> = {
  whatsapp: { width: 280, height: 220 },
  event: { width: 240, height: 120 },
  logic: { width: 260, height: 120 },
  sticky: { width: 200, height: 150 },
  table: { width: 350, height: 200 },
  journey: { width: 280, height: 220 },
};

// Minimum node sizes
const MIN_SIZES: Record<string, Size> = {
  whatsapp: { width: 220, height: 140 },
  event: { width: 200, height: 100 },
  logic: { width: 200, height: 100 },
  sticky: { width: 150, height: 100 },
  table: { width: 250, height: 150 },
  journey: { width: 240, height: 150 },
};

export default function JourneyBuilderPage() {
  const searchParams = useSearchParams();
  const journeyIdFromUrl = searchParams.get('journey');
  
  // Journey list state
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loadingJourneys, setLoadingJourneys] = useState(true);
  const [currentJourney, setCurrentJourney] = useState<Journey | null>(null);
  const [autoLoadedJourneyId, setAutoLoadedJourneyId] = useState<string | null>(null);
  
  // Create journey modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newJourneyName, setNewJourneyName] = useState('');
  const [newJourneyDescription, setNewJourneyDescription] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Edit journey modal
  const [showEditJourneyModal, setShowEditJourneyModal] = useState(false);
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [editJourneyName, setEditJourneyName] = useState('');
  const [editJourneyDescription, setEditJourneyDescription] = useState('');
  const [updatingJourney, setUpdatingJourney] = useState(false);
  
  // Journey Groups state
  const [groups, setGroups] = useState<JourneyGroup[]>([]);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [groupPath, setGroupPath] = useState<JourneyGroup[]>([]); // Breadcrumb path
  const [allGroups, setAllGroups] = useState<JourneyGroup[]>([]); // For move dropdown
  const [allJourneys, setAllJourneys] = useState<Journey[]>([]); // All journeys for Journey Link dropdown
  
  // Create group modal
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  
  // Edit group modal
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<JourneyGroup | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [updatingGroup, setUpdatingGroup] = useState(false);
  
  // Move journey modal
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [movingJourney, setMovingJourney] = useState<Journey | null>(null);
  const [moveTargetGroupId, setMoveTargetGroupId] = useState<string | null>(null);
  const [movingJourneyInProgress, setMovingJourneyInProgress] = useState(false);
  
  // 3-dot menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Add node dropdown
  const [showAddMenu, setShowAddMenu] = useState(false);
  
  // Canvas state
  const [nodes, setNodes] = useState<JourneyNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [connecting, setConnecting] = useState<{ sourceId: string; startPos: Position } | null>(null);
  const [mousePos, setMousePos] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 });
  
  // Resize state
  const [resizingNode, setResizingNode] = useState<string | null>(null);
  const [resizeDirection, setResizeDirection] = useState<'se' | 'e' | 's' | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  
  // Column resize state
  const [resizingColumn, setResizingColumn] = useState<{ nodeId: string; colIndex: number; startX: number; startWidths: number[] } | null>(null);
  
  // Save state
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const lastFittedJourneyIdRef = useRef<string | null>(null);

  // Templates state
  const [templates, setTemplates] = useState<string[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState<string | null>(null);
  
  // Journey dropdown state (for journey link nodes)
  const [showJourneyDropdown, setShowJourneyDropdown] = useState<string | null>(null);

  // Permissions state
  const [canEdit, setCanEdit] = useState(true); // Default to true for super admin
  const [showEditRestrictionModal, setShowEditRestrictionModal] = useState(false);

  // Helper function to show edit restriction prompt
  const showEditRestrictionPrompt = () => {
    setShowEditRestrictionModal(true);
  };

  // Fetch permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const data = await response.json();
          // Super admin can always edit, client users need journey_builder_edit permission
          if (data.isAdmin) {
            setCanEdit(true);
          } else if (data.permissions) {
            setCanEdit(data.permissions.journey_builder && data.permissions.journey_builder_edit);
          }
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
      }
    };
    fetchPermissions();
  }, []);

  // Fetch templates
  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch('/api/analytics');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templateNames || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Fetch templates on mount (journeys are fetched via currentGroupId effect)
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Auto-load journey from URL query parameter
  useEffect(() => {
    if (journeyIdFromUrl && allJourneys.length > 0 && !currentJourney && autoLoadedJourneyId !== journeyIdFromUrl) {
      // Search in allJourneys to find journeys from any folder
      const journey = allJourneys.find(j => j.id === journeyIdFromUrl);
      if (journey) {
        setAutoLoadedJourneyId(journeyIdFromUrl);
        loadJourney(journey);
      }
    }
  }, [journeyIdFromUrl, allJourneys, currentJourney, autoLoadedJourneyId]);

  // Close add menu, dropdowns, and 3-dot menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (addMenuRef.current && !addMenuRef.current.contains(target)) {
        setShowAddMenu(false);
      }
      // Close template dropdown if clicking outside
      if (showTemplateDropdown && !target.closest('.template-dropdown-container')) {
        setShowTemplateDropdown(null);
      }
      // Close journey dropdown if clicking outside
      if (showJourneyDropdown && !target.closest('.journey-dropdown-container')) {
        setShowJourneyDropdown(null);
      }
      // Close 3-dot menu if clicking outside
      if (openMenuId && !target.closest('.three-dot-menu')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTemplateDropdown, showJourneyDropdown, openMenuId]);

  // Auto-save removed - user must click Save button manually

  const fetchJourneysAndGroups = async (groupId: string | null = null) => {
    setLoadingJourneys(true);
    try {
      const groupParam = groupId ? `group_id=${groupId}` : 'group_id=null';
      
      // Fetch journeys and groups in parallel
      const [journeysRes, groupsRes, allGroupsRes, allJourneysRes] = await Promise.all([
        fetch(`/api/journeys?${groupParam}`),
        fetch(`/api/journey-groups?parent_group_id=${groupId || 'null'}`),
        fetch('/api/journey-groups'), // Get all groups for move dropdown
        fetch('/api/journeys?all=true'), // Get all journeys for Journey Link dropdown
      ]);
      
      if (journeysRes.ok) {
        const data = await journeysRes.json();
        setJourneys(data);
      }
      
      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setGroups(data);
      }
      
      if (allGroupsRes.ok) {
        const data = await allGroupsRes.json();
        setAllGroups(data);
      }
      
      if (allJourneysRes.ok) {
        const data = await allJourneysRes.json();
        setAllJourneys(data);
      }
    } catch (error) {
      console.error('Failed to fetch journeys:', error);
    } finally {
      setLoadingJourneys(false);
    }
  };

  // Navigate into a group
  const navigateToGroup = async (group: JourneyGroup | null) => {
    if (group) {
      setCurrentGroupId(group.id);
      setGroupPath([...groupPath, group]);
    } else {
      // Navigate to root
      setCurrentGroupId(null);
      setGroupPath([]);
    }
  };

  // Navigate to a specific point in breadcrumb
  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      // Go to root
      setCurrentGroupId(null);
      setGroupPath([]);
    } else {
      const group = groupPath[index];
      setCurrentGroupId(group.id);
      setGroupPath(groupPath.slice(0, index + 1));
    }
  };

  // Fetch when currentGroupId changes
  useEffect(() => {
    fetchJourneysAndGroups(currentGroupId);
  }, [currentGroupId]);

  // Legacy function name for compatibility
  const fetchJourneys = () => fetchJourneysAndGroups(currentGroupId);

  const createJourney = async () => {
    if (!newJourneyName.trim()) return;
    
    setCreating(true);
    try {
      const response = await fetch('/api/journeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newJourneyName,
          description: newJourneyDescription || null,
          group_id: currentGroupId,
        }),
      });
      
      if (response.ok) {
        const journey = await response.json();
        setJourneys([journey, ...journeys]);
        loadJourney(journey);
        setShowCreateModal(false);
        setNewJourneyName('');
        setNewJourneyDescription('');
      }
    } catch (error) {
      console.error('Failed to create journey:', error);
    } finally {
      setCreating(false);
    }
  };

  const loadJourney = async (journey: Journey) => {
    try {
      const response = await fetch(`/api/journeys/${journey.id}`);
      if (response.ok) {
        const fullJourney = await response.json();
        setCurrentJourney(fullJourney);
        setNodes(fullJourney.nodes || []);
        setConnections(fullJourney.connections || []);
        // Don't restore canvas_state - we'll fit to screen automatically
        // Reset zoom and pan initially, fit to screen will be called via useEffect
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setHasUnsavedChanges(false);
        setLastSaved(new Date(fullJourney.updated_at));
      }
    } catch (error) {
      console.error('Failed to load journey:', error);
    }
  };

  const saveJourney = async () => {
    if (!currentJourney || !canEdit) return; // Prevent saving in view-only mode
    
    setSaving(true);
    try {
      const response = await fetch(`/api/journeys/${currentJourney.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes,
          connections,
          canvas_state: { zoom, panX: pan.x, panY: pan.y },
        }),
      });
      
      if (response.ok) {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Failed to save journey:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteJourney = async (journeyId: string) => {
    if (!confirm('Are you sure you want to delete this journey?')) return;
    
    try {
      const response = await fetch(`/api/journeys/${journeyId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setJourneys(journeys.filter(j => j.id !== journeyId));
        if (currentJourney?.id === journeyId) {
          setCurrentJourney(null);
          setNodes([]);
          setConnections([]);
        }
      }
    } catch (error) {
      console.error('Failed to delete journey:', error);
    }
  };

  const openEditJourneyModal = (journey: Journey, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingJourney(journey);
    setEditJourneyName(journey.name);
    setEditJourneyDescription(journey.description || '');
    setShowEditJourneyModal(true);
  };

  const updateJourneyDetails = async () => {
    if (!editingJourney || !editJourneyName.trim()) return;
    
    setUpdatingJourney(true);
    try {
      const response = await fetch(`/api/journeys/${editingJourney.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editJourneyName,
          description: editJourneyDescription || null,
        }),
      });
      
      if (response.ok) {
        await response.json(); // Consume response
        setJourneys(journeys.map(j => j.id === editingJourney.id ? { ...j, name: editJourneyName, description: editJourneyDescription || null } : j));
        // Update currentJourney if it's the one being edited
        if (currentJourney?.id === editingJourney.id) {
          setCurrentJourney({ ...currentJourney, name: editJourneyName, description: editJourneyDescription || null });
        }
        setShowEditJourneyModal(false);
        setEditingJourney(null);
      }
    } catch (error) {
      console.error('Failed to update journey:', error);
    } finally {
      setUpdatingJourney(false);
    }
  };

  // Group CRUD operations
  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    
    setCreatingGroup(true);
    try {
      const response = await fetch('/api/journey-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription || null,
          parent_group_id: currentGroupId,
        }),
      });
      
      if (response.ok) {
        const group = await response.json();
        setGroups([...groups, group]);
        setAllGroups([...allGroups, group]);
        setShowCreateGroupModal(false);
        setNewGroupName('');
        setNewGroupDescription('');
      }
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setCreatingGroup(false);
    }
  };

  const openEditGroupModal = (group: JourneyGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGroup(group);
    setEditGroupName(group.name);
    setEditGroupDescription(group.description || '');
    setShowEditGroupModal(true);
    setOpenMenuId(null);
  };

  const updateGroupDetails = async () => {
    if (!editingGroup || !editGroupName.trim()) return;
    
    setUpdatingGroup(true);
    try {
      const response = await fetch(`/api/journey-groups/${editingGroup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editGroupName,
          description: editGroupDescription || null,
        }),
      });
      
      if (response.ok) {
        await response.json();
        setGroups(groups.map(g => g.id === editingGroup.id ? { ...g, name: editGroupName, description: editGroupDescription || null } : g));
        setAllGroups(allGroups.map(g => g.id === editingGroup.id ? { ...g, name: editGroupName, description: editGroupDescription || null } : g));
        setShowEditGroupModal(false);
        setEditingGroup(null);
      }
    } catch (error) {
      console.error('Failed to update group:', error);
    } finally {
      setUpdatingGroup(false);
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group? Journeys and sub-groups inside will be moved to the parent folder.')) return;
    
    try {
      const response = await fetch(`/api/journey-groups/${groupId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Refresh to get updated list (journeys moved to parent)
        fetchJourneysAndGroups(currentGroupId);
      }
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
    setOpenMenuId(null);
  };

  // Move journey
  const openMoveModal = (journey: Journey, e: React.MouseEvent) => {
    e.stopPropagation();
    setMovingJourney(journey);
    setMoveTargetGroupId(journey.group_id);
    setShowMoveModal(true);
    setOpenMenuId(null);
  };

  const moveJourney = async () => {
    if (!movingJourney) return;
    
    setMovingJourneyInProgress(true);
    try {
      const response = await fetch(`/api/journeys/${movingJourney.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: moveTargetGroupId,
        }),
      });
      
      if (response.ok) {
        // Remove from current view if moved to different group
        if (moveTargetGroupId !== currentGroupId) {
          setJourneys(journeys.filter(j => j.id !== movingJourney.id));
        }
        setShowMoveModal(false);
        setMovingJourney(null);
      }
    } catch (error) {
      console.error('Failed to move journey:', error);
    } finally {
      setMovingJourneyInProgress(false);
    }
  };

  // Add nodes
  const addNode = (type: NodeType) => {
    if (!canEdit) {
      showEditRestrictionPrompt();
      return;
    }
    const basePosition = { 
      x: 100 - pan.x / zoom + Math.random() * 100, 
      y: 100 - pan.y / zoom + Math.random() * 100 
    };

    let newNode: JourneyNode;

    switch (type) {
      case 'whatsapp':
        newNode = {
          id: generateId(),
          type: 'whatsapp',
          position: basePosition,
          data: { message: 'Hello! 👋\n\nThis is your WhatsApp message...' },
          outputs: [],
        };
        break;
      case 'event':
        newNode = {
          id: generateId(),
          type: 'event',
          position: basePosition,
          data: { eventType: 'webhook', description: 'Catch incoming events' },
          outputs: [],
        };
        break;
      case 'logic':
        newNode = {
          id: generateId(),
          type: 'logic',
          position: basePosition,
          data: { condition: 'if / else', description: 'Add your condition logic here...' },
          outputs: [],
        };
        break;
      case 'sticky':
        newNode = {
          id: generateId(),
          type: 'sticky',
          position: basePosition,
          data: { content: 'Add your notes here...', color: STICKY_COLORS[0] },
          outputs: [],
        };
        break;
      case 'table':
        newNode = {
          id: generateId(),
          type: 'table',
          position: basePosition,
          data: { 
            headers: ['Column 1', 'Column 2', 'Column 3'],
            rows: [
              ['', '', ''],
              ['', '', ''],
            ]
          },
          outputs: [],
        };
        break;
      case 'journey':
        newNode = {
          id: generateId(),
          type: 'journey',
          position: basePosition,
          data: { 
            targetJourneyId: null,
            targetJourneyName: null,
            description: 'Link to another journey...'
          },
          outputs: [],
        };
        break;
    }

    setNodes([...nodes, newNode]);
    setSelectedNode(newNode.id);
    setHasUnsavedChanges(true);
    setShowAddMenu(false);
  };

  // Update node data
  const updateNodeData = (nodeId: string, updates: Record<string, unknown>) => {
    if (!canEdit) {
      showEditRestrictionPrompt();
      return;
    }
    setNodes(prev => prev.map(node => 
      node.id === nodeId 
        ? { ...node, data: { ...node.data, ...updates } } as JourneyNode
        : node
    ));
    setHasUnsavedChanges(true);
  };

  // Table manipulation functions
  const addTableColumn = (nodeId: string) => {
    if (!canEdit) {
      showEditRestrictionPrompt();
      return;
    }
    setNodes(prev => prev.map(node => {
      if (node.id !== nodeId || node.type !== 'table') return node;
      const tableNode = node as TableNode;
      const newHeaders = [...tableNode.data.headers, `Column ${tableNode.data.headers.length + 1}`];
      const newRows = tableNode.data.rows.map(row => [...row, '']);
      return { ...node, data: { ...tableNode.data, headers: newHeaders, rows: newRows } };
    }));
    setHasUnsavedChanges(true);
  };

  const removeTableColumn = (nodeId: string, colIndex: number) => {
    if (!canEdit) return; // Prevent in view-only mode
    setNodes(prev => prev.map(node => {
      if (node.id !== nodeId || node.type !== 'table') return node;
      const tableNode = node as TableNode;
      if (tableNode.data.headers.length <= 1) return node; // Keep at least one column
      const newHeaders = tableNode.data.headers.filter((_, i) => i !== colIndex);
      const newRows = tableNode.data.rows.map(row => row.filter((_, i) => i !== colIndex));
      return { ...node, data: { ...tableNode.data, headers: newHeaders, rows: newRows } };
    }));
    setHasUnsavedChanges(true);
  };

  const addTableRow = (nodeId: string) => {
    if (!canEdit) {
      showEditRestrictionPrompt();
      return;
    }
    setNodes(prev => prev.map(node => {
      if (node.id !== nodeId || node.type !== 'table') return node;
      const tableNode = node as TableNode;
      const newRow = new Array(tableNode.data.headers.length).fill('');
      return { ...node, data: { ...tableNode.data, rows: [...tableNode.data.rows, newRow] } };
    }));
    setHasUnsavedChanges(true);
  };

  const removeTableRow = (nodeId: string, rowIndex: number) => {
    if (!canEdit) {
      showEditRestrictionPrompt();
      return;
    }
    setNodes(prev => prev.map(node => {
      if (node.id !== nodeId || node.type !== 'table') return node;
      const tableNode = node as TableNode;
      if (tableNode.data.rows.length <= 1) return node; // Keep at least one row
      const newRows = tableNode.data.rows.filter((_, i) => i !== rowIndex);
      return { ...node, data: { ...tableNode.data, rows: newRows } };
    }));
    setHasUnsavedChanges(true);
  };

  const updateTableHeader = (nodeId: string, colIndex: number, value: string) => {
    if (!canEdit) {
      showEditRestrictionPrompt();
      return;
    }
    setNodes(prev => prev.map(node => {
      if (node.id !== nodeId || node.type !== 'table') return node;
      const tableNode = node as TableNode;
      const newHeaders = [...tableNode.data.headers];
      newHeaders[colIndex] = value;
      return { ...node, data: { ...tableNode.data, headers: newHeaders } };
    }));
    setHasUnsavedChanges(true);
  };

  const updateTableCell = (nodeId: string, rowIndex: number, colIndex: number, value: string) => {
    if (!canEdit) {
      showEditRestrictionPrompt();
      return;
    }
    setNodes(prev => prev.map(node => {
      if (node.id !== nodeId || node.type !== 'table') return node;
      const tableNode = node as TableNode;
      const newRows = tableNode.data.rows.map((row, rIdx) => 
        rIdx === rowIndex ? row.map((cell, cIdx) => cIdx === colIndex ? value : cell) : row
      );
      return { ...node, data: { ...tableNode.data, rows: newRows } };
    }));
    setHasUnsavedChanges(true);
  };

  // Column resize handlers
  const handleColumnResizeStart = (e: React.MouseEvent, nodeId: string, colIndex: number) => {
    if (!canEdit) {
      e.preventDefault();
      e.stopPropagation();
      showEditRestrictionPrompt();
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    const node = nodes.find(n => n.id === nodeId);
    if (!node || node.type !== 'table') return;
    const tableNode = node as TableNode;
    const numCols = tableNode.data.headers.length;
    const defaultWidth = 100 / numCols;
    const currentWidths = tableNode.data.columnWidths || new Array(numCols).fill(defaultWidth);
    
    setResizingColumn({
      nodeId,
      colIndex,
      startX: e.clientX,
      startWidths: [...currentWidths],
    });
  };

  const updateColumnWidths = (nodeId: string, newWidths: number[]) => {
    if (!canEdit) return; // Prevent in view-only mode
    setNodes(prev => prev.map(node => {
      if (node.id !== nodeId || node.type !== 'table') return node;
      return { ...node, data: { ...node.data, columnWidths: newWidths } };
    }));
    setHasUnsavedChanges(true);
  };

  // Delete a node
  const deleteNode = (nodeId: string) => {
    if (!canEdit) {
      showEditRestrictionPrompt();
      return;
    }
    setNodes(nodes.filter(node => node.id !== nodeId));
    setConnections(connections.filter(
      conn => conn.sourceId !== nodeId && conn.targetId !== nodeId
    ));
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
    setHasUnsavedChanges(true);
  };

  // Duplicate a node
  const duplicateNode = (nodeId: string) => {
    if (!canEdit) {
      showEditRestrictionPrompt();
      return;
    }
    const nodeToDuplicate = nodes.find(n => n.id === nodeId);
    if (!nodeToDuplicate) return;

    const newNode: JourneyNode = {
      ...nodeToDuplicate,
      id: generateId(),
      position: {
        x: nodeToDuplicate.position.x + 30,
        y: nodeToDuplicate.position.y + 30,
      },
      outputs: [], // Don't copy connections
      data: { ...nodeToDuplicate.data }, // Deep copy data
      size: nodeToDuplicate.size ? { ...nodeToDuplicate.size } : undefined,
    } as JourneyNode;

    setNodes([...nodes, newNode]);
    setSelectedNode(newNode.id);
    setHasUnsavedChanges(true);
  };

  // Handle node drag start
  const handleNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
    if (!canEdit) {
      e.preventDefault();
      e.stopPropagation();
      showEditRestrictionPrompt();
      return;
    }
    if ((e.target as HTMLElement).closest('.node-handle') || 
        (e.target as HTMLElement).closest('.node-output') ||
        (e.target as HTMLElement).closest('.node-input')) {
      return;
    }
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    setDraggingNode(nodeId);
    setDragOffset({
      x: (e.clientX - rect.left - pan.x) / zoom - node.position.x,
      y: (e.clientY - rect.top - pan.y) / zoom - node.position.y,
    });
    setSelectedNode(nodeId);
  };

  // Handle mouse move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom;
    setMousePos({ x: canvasX, y: canvasY });

    if (draggingNode && canEdit) {
      setNodes(prev => prev.map(node =>
        node.id === draggingNode
          ? { ...node, position: { x: canvasX - dragOffset.x, y: canvasY - dragOffset.y } }
          : node
      ));
      setHasUnsavedChanges(true);
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }

    // Handle resizing
    if (resizingNode && resizeStart && resizeDirection) {
      const deltaX = canvasX - resizeStart.x;
      const deltaY = canvasY - resizeStart.y;
      
      setNodes(prev => prev.map(node => {
        if (node.id !== resizingNode) return node;
        
        const nodeType = (node.type as string) === 'text' ? 'logic' : node.type;
        const minSize = MIN_SIZES[nodeType] || { width: 150, height: 100 };
        
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        
        if (resizeDirection === 'e' || resizeDirection === 'se') {
          newWidth = Math.max(minSize.width, resizeStart.width + deltaX);
        }
        if (resizeDirection === 's' || resizeDirection === 'se') {
          newHeight = Math.max(minSize.height, resizeStart.height + deltaY);
        }
        
        return { ...node, size: { width: newWidth, height: newHeight } };
      }));
      setHasUnsavedChanges(true);
    }

    // Handle column resizing
    if (resizingColumn) {
      const deltaX = e.clientX - resizingColumn.startX;
      const deltaPercent = (deltaX / 3); // Adjust sensitivity
      const { nodeId, colIndex, startWidths } = resizingColumn;
      
      // Calculate new widths
      const newWidths = [...startWidths];
      const minWidth = 10; // Minimum 10% width
      
      // Adjust current column and next column
      if (colIndex < newWidths.length - 1) {
        const newCurrentWidth = Math.max(minWidth, startWidths[colIndex] + deltaPercent);
        const newNextWidth = Math.max(minWidth, startWidths[colIndex + 1] - deltaPercent);
        
        // Only update if both columns remain above minimum
        if (newCurrentWidth >= minWidth && newNextWidth >= minWidth) {
          newWidths[colIndex] = newCurrentWidth;
          newWidths[colIndex + 1] = newNextWidth;
          updateColumnWidths(nodeId, newWidths);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingNode, dragOffset, zoom, pan, isPanning, panStart, resizingNode, resizeStart, resizeDirection, resizingColumn]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (draggingNode) {
      setDraggingNode(null);
    }
    if (connecting) {
      setConnecting(null);
    }
    if (isPanning) {
      setIsPanning(false);
    }
    if (resizingNode) {
      setResizingNode(null);
      setResizeDirection(null);
      setResizeStart(null);
    }
    if (resizingColumn) {
      setResizingColumn(null);
    }
  }, [draggingNode, connecting, isPanning, resizingNode, resizingColumn]);

  // Handle connection start
  const handleConnectionStart = (e: React.MouseEvent, nodeId: string, nodeType: NodeType) => {
    if (!canEdit) {
      e.preventDefault();
      e.stopPropagation();
      showEditRestrictionPrompt();
      return;
    }
    if (nodeType === 'sticky') return; // Sticky notes can't connect
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const nodeWidth = nodeType === 'whatsapp' ? 280 : nodeType === 'event' ? 240 : 260;
    setConnecting({
      sourceId: nodeId,
      startPos: {
        x: node.position.x + nodeWidth,
        y: node.position.y + 50,
      },
    });
  };

  // Handle connection end
  const handleConnectionEnd = (e: React.MouseEvent, targetId: string, targetType: NodeType) => {
    if (!canEdit) {
      e.preventDefault();
      e.stopPropagation();
      showEditRestrictionPrompt();
      return;
    }
    if (targetType === 'sticky') return; // Sticky notes can't receive connections
    e.stopPropagation();
    if (connecting && connecting.sourceId !== targetId) {
      const exists = connections.some(
        conn => conn.sourceId === connecting.sourceId && conn.targetId === targetId
      );
      if (!exists) {
        const newConnection: Connection = {
          id: `conn_${Date.now()}`,
          sourceId: connecting.sourceId,
          targetId: targetId,
        };
        setConnections([...connections, newConnection]);
        setNodes(nodes.map(node =>
          node.id === connecting.sourceId
            ? { ...node, outputs: [...node.outputs, targetId] }
            : node
        ));
        setHasUnsavedChanges(true);
      }
    }
    setConnecting(null);
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, nodeId: string, direction: 'se' | 'e' | 's') => {
    if (!canEdit) {
      e.preventDefault();
      e.stopPropagation();
      showEditRestrictionPrompt();
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const nodeType = (node.type as string) === 'text' ? 'logic' : node.type;
    const defaultSize = DEFAULT_SIZES[nodeType] || { width: 240, height: 120 };
    const currentSize = node.size || defaultSize;
    
    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom;
    
    setResizingNode(nodeId);
    setResizeDirection(direction);
    setResizeStart({
      x: canvasX,
      y: canvasY,
      width: currentSize.width,
      height: currentSize.height,
    });
  };

  // Delete connection
  const deleteConnection = (connectionId: string) => {
    const conn = connections.find(c => c.id === connectionId);
    if (conn) {
      setConnections(connections.filter(c => c.id !== connectionId));
      setNodes(nodes.map(node =>
        node.id === conn.sourceId
          ? { ...node, outputs: node.outputs.filter(id => id !== conn.targetId) }
          : node
      ));
      setHasUnsavedChanges(true);
    }
  };

  // Canvas pan start
  const handleCanvasPanStart = (e: React.MouseEvent) => {
    // Check if clicking on canvas background (not on a node)
    const target = e.target as Element;
    const isCanvas = target === canvasRef.current || 
                     target === svgRef.current ||
                     target.classList.contains('canvas-background');
    
    if (isCanvas) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      });
      setSelectedNode(null);
    }
  };

  // Zoom controls
  const handleZoomIn = () => setZoom(Math.min(zoom + 0.1, 2));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.1, 0.1)); // Min zoom is 10%
  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Fit to screen - show all nodes
  const handleFitToScreen = useCallback(() => {
    if (nodes.length === 0) {
      handleZoomReset();
      return;
    }

    if (!canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const canvasWidth = canvasRect.width;
    const canvasHeight = canvasRect.height;

    // Calculate bounding box of all nodes
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach(node => {
      // Handle legacy 'text' type
      const nodeType = (node.type as string) === 'text' ? 'logic' : node.type;
      const defaultSize = DEFAULT_SIZES[nodeType] || { width: 240, height: 120 };
      const nodeSize = node.size || defaultSize;

      const nodeLeft = node.position.x;
      const nodeTop = node.position.y;
      const nodeRight = nodeLeft + nodeSize.width;
      const nodeBottom = nodeTop + nodeSize.height;

      minX = Math.min(minX, nodeLeft);
      minY = Math.min(minY, nodeTop);
      maxX = Math.max(maxX, nodeRight);
      maxY = Math.max(maxY, nodeBottom);
    });

    // Add padding around nodes (20% padding on each side)
    const padding = 0.2;
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const paddedWidth = contentWidth * (1 + padding * 2);
    const paddedHeight = contentHeight * (1 + padding * 2);

    // Calculate zoom to fit all nodes
    const zoomX = canvasWidth / paddedWidth;
    const zoomY = canvasHeight / paddedHeight;
    let newZoom = Math.min(zoomX, zoomY);

    // Ensure minimum zoom is 10% (0.1)
    newZoom = Math.max(newZoom, 0.1);

    // Calculate center of nodes
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Calculate pan to center the nodes
    // We need to center the content in the canvas
    const newPanX = (canvasWidth / 2) - (centerX * newZoom);
    const newPanY = (canvasHeight / 2) - (centerY * newZoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [nodes, handleZoomReset]);

  // Add event listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Auto-fit to screen when a journey is loaded
  useEffect(() => {
    if (currentJourney && nodes.length > 0 && lastFittedJourneyIdRef.current !== currentJourney.id) {
      // Mark this journey as fitted
      lastFittedJourneyIdRef.current = currentJourney.id;
      
      // Use setTimeout to ensure DOM is ready
      const timer = setTimeout(() => {
        // Inline fit-to-screen logic to avoid dependency array issues
        if (!canvasRef.current) return;

        const canvasRect = canvasRef.current.getBoundingClientRect();
        const canvasWidth = canvasRect.width;
        const canvasHeight = canvasRect.height;

        // Calculate bounding box of all nodes
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        nodes.forEach(node => {
          // Handle legacy 'text' type
          const nodeType = (node.type as string) === 'text' ? 'logic' : node.type;
          const defaultSize = DEFAULT_SIZES[nodeType] || { width: 240, height: 120 };
          const nodeSize = node.size || defaultSize;

          const nodeLeft = node.position.x;
          const nodeTop = node.position.y;
          const nodeRight = nodeLeft + nodeSize.width;
          const nodeBottom = nodeTop + nodeSize.height;

          minX = Math.min(minX, nodeLeft);
          minY = Math.min(minY, nodeTop);
          maxX = Math.max(maxX, nodeRight);
          maxY = Math.max(maxY, nodeBottom);
        });

        // Add padding around nodes (20% padding on each side)
        const padding = 0.2;
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const paddedWidth = contentWidth * (1 + padding * 2);
        const paddedHeight = contentHeight * (1 + padding * 2);

        // Calculate zoom to fit all nodes
        const zoomX = canvasWidth / paddedWidth;
        const zoomY = canvasHeight / paddedHeight;
        let newZoom = Math.min(zoomX, zoomY);

        // Ensure minimum zoom is 10% (0.1)
        newZoom = Math.max(newZoom, 0.1);

        // Calculate center of nodes
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // Calculate pan to center the nodes
        const newPanX = (canvasWidth / 2) - (centerX * newZoom);
        const newPanY = (canvasHeight / 2) - (centerY * newZoom);

        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
      }, 100);
      return () => clearTimeout(timer);
    } else if (!currentJourney) {
      // Reset ref when journey is unloaded
      lastFittedJourneyIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentJourney?.id, nodes.length]); // Trigger when journey changes or nodes are loaded (nodes array used in callback via closure)

  // Get node position for connection
  const getNodeConnectionPoint = (nodeId: string, isOutput: boolean) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    
    // Handle legacy 'text' type as 'logic'
    const nodeType = (node.type as string) === 'text' ? 'logic' : node.type;
    const defaultSize = DEFAULT_SIZES[nodeType] || { width: 240, height: 120 };
    const nodeSize = node.size || defaultSize;
    
    return {
      x: isOutput ? node.position.x + nodeSize.width : node.position.x,
      y: node.position.y + nodeSize.height / 2,
    };
  };

  // Draw bezier curve path
  const getBezierPath = (start: Position, end: Position) => {
    const midX = (start.x + end.x) / 2;
    return `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
  };

  // Render node based on type
  const renderNode = (node: JourneyNode) => {
    // Handle legacy 'text' type nodes by treating them as 'logic'
    const rawType = node.type as string;
    const nodeType = rawType === 'text' ? 'logic' : rawType;
    const style = NODE_STYLES[nodeType as keyof typeof NODE_STYLES] || NODE_STYLES.logic;
    const Icon = style.icon;
    const isSelected = selectedNode === node.id;
    const isDragging = draggingNode === node.id;

    // Get node size
    const defaultSize = DEFAULT_SIZES[nodeType] || { width: 240, height: 120 };
    const nodeSize = node.size || defaultSize;

    // Sticky note rendering (special case)
    if (nodeType === 'sticky') {
      const stickyNode = node as StickyNode;
      return (
        <div
          key={node.id}
          className={`absolute rounded-lg shadow-lg transition-shadow pointer-events-auto ${
            isSelected ? 'shadow-xl ring-2 ring-[var(--primary)]' : ''
          }`}
          style={{
            left: node.position.x,
            top: node.position.y,
            width: nodeSize.width,
            height: nodeSize.height,
            backgroundColor: stickyNode.data.color,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => handleNodeDragStart(e, node.id)}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-black/10">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-black/40 node-handle" />
              <StickyNote className="w-4 h-4 text-black/60" />
              <span className="text-sm font-medium text-black/80">Note</span>
            </div>
            {canEdit && (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); duplicateNode(node.id); }}
                  className="p-1 rounded hover:bg-black/10 text-black/40 hover:text-black/60 transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                  className="p-1 rounded hover:bg-black/10 text-black/40 hover:text-[var(--error)] transition-colors"
                  title="Delete"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          {/* Content */}
          <div className="p-3 flex-1" style={{ height: nodeSize.height - 80 }}>
            <VariableTextarea
              value={stickyNode.data.content}
              onChange={(e) => updateNodeData(node.id, { content: e.target.value })}
              className="text-sm text-black/80 placeholder-black/40"
              placeholder="Add your notes..."
            />
          </div>
          {/* Color picker */}
          <div className="px-3 pb-3 flex gap-1">
            {STICKY_COLORS.map(color => (
              <button
                key={color}
                onClick={(e) => { e.stopPropagation(); updateNodeData(node.id, { color }); }}
                className={`w-5 h-5 rounded-full border-2 ${
                  stickyNode.data.color === color ? 'border-black/40' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          {/* Resize handles */}
          <div
            className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
            style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '0 0 6px 0' }}
            onMouseDown={(e) => handleResizeStart(e, node.id, 'se')}
          />
          <div
            className="absolute bottom-0 left-3 right-3 h-2 cursor-s-resize"
            onMouseDown={(e) => handleResizeStart(e, node.id, 's')}
          />
          <div
            className="absolute top-3 bottom-3 right-0 w-2 cursor-e-resize"
            onMouseDown={(e) => handleResizeStart(e, node.id, 'e')}
          />
        </div>
      );
    }

    // Table node
    if (nodeType === 'table') {
      const tableNode = node as TableNode;
      return (
        <div
          key={node.id}
          className={`absolute rounded-lg border-2 bg-white shadow-lg transition-shadow pointer-events-auto ${
            isSelected ? 'shadow-xl' : ''
          }`}
          style={{
            left: node.position.x,
            top: node.position.y,
            width: nodeSize.width,
            height: nodeSize.height,
            borderColor: isSelected ? style.bg : '#E5E7EB',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => handleNodeDragStart(e, node.id)}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between px-3 py-2 rounded-t-md border-b"
            style={{ backgroundColor: style.bgLight, borderColor: '#E5E7EB' }}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-[var(--neutral-400)] node-handle" />
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: style.bg }}>
                <Table2 className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-medium text-[var(--neutral-900)]">{style.label}</span>
            </div>
            {canEdit && (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); duplicateNode(node.id); }}
                  className="p-1 rounded hover:bg-[var(--neutral-200)] text-[var(--neutral-400)] hover:text-[var(--neutral-600)] transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                  className="p-1 rounded hover:bg-[var(--error-light)] text-[var(--neutral-400)] hover:text-[var(--error)] transition-colors"
                  title="Delete"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          {/* Table controls */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--neutral-200)] bg-[var(--neutral-50)]">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); addTableColumn(node.id); }}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors"
                title="Add Column"
              >
                <PlusCircle className="w-3 h-3" />
                Column
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); addTableRow(node.id); }}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-[var(--success-light)] text-[var(--success)] hover:bg-[var(--success)] hover:text-white transition-colors"
                title="Add Row"
              >
                <PlusCircle className="w-3 h-3" />
                Row
              </button>
              <div className="w-px h-4 bg-[var(--neutral-300)]" />
              <button
                onClick={(e) => { e.stopPropagation(); updateNodeData(node.id, { textWrap: !tableNode.data.textWrap }); }}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                  tableNode.data.textWrap 
                    ? 'bg-[var(--primary)] text-white' 
                    : 'bg-[var(--neutral-200)] text-[var(--neutral-600)] hover:bg-[var(--neutral-300)]'
                }`}
                title={tableNode.data.textWrap ? "Disable text wrap" : "Enable text wrap"}
              >
                <WrapText className="w-3 h-3" />
                Wrap
              </button>
            </div>
            <span className="text-xs text-[var(--neutral-500)]">
              {tableNode.data.headers.length} cols × {tableNode.data.rows.length} rows
            </span>
          </div>
          {/* Table content */}
          <div className="overflow-hidden" style={{ height: nodeSize.height - 95 }}>
            <div className="overflow-x-hidden overflow-y-auto h-full">
              <table className="w-full text-sm border-collapse table-fixed">
                <thead>
                  <tr>
                    {tableNode.data.headers.map((header, colIndex) => {
                      const numCols = tableNode.data.headers.length;
                      const defaultWidth = 100 / numCols;
                      const colWidth = tableNode.data.columnWidths?.[colIndex] ?? defaultWidth;
                      return (
                        <th 
                          key={colIndex} 
                          className="border-b border-r border-[var(--neutral-200)] bg-[var(--neutral-100)] p-0 relative group"
                          style={{ width: `${colWidth}%` }}
                        >
                          <div className="px-2 py-1.5">
                            <VariableInput
                              value={header}
                              onChange={(e) => updateTableHeader(node.id, colIndex, e.target.value)}
                              className="text-xs font-semibold text-[var(--neutral-700)] focus:bg-white"
                              placeholder="Header"
                            />
                          </div>
                          {tableNode.data.headers.length > 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); removeTableColumn(node.id, colIndex); }}
                              className="absolute top-0 right-4 p-0.5 opacity-0 group-hover:opacity-100 text-[var(--error)] hover:bg-[var(--error-light)] rounded transition-opacity z-10"
                              title="Delete column"
                            >
                              <MinusCircle className="w-3 h-3" />
                            </button>
                          )}
                          {/* Column resize handle */}
                          {colIndex < tableNode.data.headers.length - 1 && (
                            <div
                              className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[var(--primary)] opacity-0 hover:opacity-100 transition-opacity z-20"
                              onMouseDown={(e) => handleColumnResizeStart(e, node.id, colIndex)}
                            />
                          )}
                        </th>
                      );
                    })}
                </tr>
              </thead>
              <tbody>
                {tableNode.data.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className={`group/row ${tableNode.data.textWrap ? 'align-top' : ''}`}>
                    {row.map((cell, colIndex) => (
                      <td 
                        key={colIndex} 
                        className={`border-b border-r border-[var(--neutral-200)] p-0 relative ${tableNode.data.textWrap ? 'align-top' : ''}`}
                      >
                        {tableNode.data.textWrap ? (
                          <div className="px-2 py-1.5 min-h-[28px]">
                            <div className="relative">
                              {/* Highlight overlay */}
                              <div 
                                className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words text-xs"
                                style={{ 
                                  padding: 'inherit',
                                  margin: 0,
                                  border: 'none',
                                  outline: 'none'
                                }}
                                aria-hidden="true"
                              >
                                {cell ? highlightVariables(cell) : <span className="opacity-50">...</span>}
                              </div>
                              {/* Actual textarea - text is transparent, only caret is visible */}
                              <textarea
                                value={cell}
                                onChange={(e) => updateTableCell(node.id, rowIndex, colIndex, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                rows={1}
                                className="w-full text-xs bg-transparent resize-none focus:outline-none focus:bg-[var(--primary-light)] overflow-hidden whitespace-pre-wrap break-words"
                                placeholder=""
                                style={{ 
                                  minHeight: '18px', 
                                  wordWrap: 'break-word', 
                                  overflowWrap: 'break-word',
                                  color: 'transparent',
                                  caretColor: 'black'
                                }}
                                ref={(el) => {
                                  if (el) {
                                    el.style.height = 'auto';
                                    el.style.height = el.scrollHeight + 'px';
                                  }
                                }}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = target.scrollHeight + 'px';
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="px-2 py-1.5">
                            <VariableInput
                              value={cell}
                              onChange={(e) => updateTableCell(node.id, rowIndex, colIndex, e.target.value)}
                              className="text-xs text-[var(--neutral-700)] focus:bg-[var(--primary-light)]"
                              placeholder="..."
                            />
                          </div>
                        )}
                      </td>
                    ))}
                    {tableNode.data.rows.length > 1 && (
                      <td className={`border-b border-[var(--neutral-200)] p-0 w-6 ${tableNode.data.textWrap ? 'align-top' : ''}`}>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeTableRow(node.id, rowIndex); }}
                          className={`p-0.5 ${tableNode.data.textWrap ? 'mt-1.5' : ''} opacity-0 group-hover/row:opacity-100 text-[var(--error)] hover:bg-[var(--error-light)] rounded transition-opacity`}
                          title="Delete row"
                        >
                          <MinusCircle className="w-3 h-3" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
          {/* Connection points */}
          <div
            className="node-input absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 cursor-crosshair hover:scale-125 transition-transform"
            style={{ borderColor: style.bg }}
            onMouseUp={(e) => handleConnectionEnd(e, node.id, node.type)}
          />
          <div
            className="node-output absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white cursor-crosshair hover:scale-125 transition-transform"
            style={{ backgroundColor: style.bg }}
            onMouseDown={(e) => handleConnectionStart(e, node.id, node.type)}
          />
          {/* Resize handle */}
          <div
            className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize rounded-br-md"
            style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
            onMouseDown={(e) => handleResizeStart(e, node.id, 'se')}
          />
        </div>
      );
    }

    // WhatsApp node
    if (nodeType === 'whatsapp') {
      const waNode = node as WhatsAppNode;
      return (
        <div
          key={node.id}
          className={`absolute rounded-lg border-2 bg-white shadow-lg transition-shadow pointer-events-auto ${
            isSelected ? 'shadow-xl' : ''
          }`}
          style={{
            left: node.position.x,
            top: node.position.y,
            width: nodeSize.width,
            height: nodeSize.height,
            borderColor: isSelected ? style.bg : '#E5E7EB',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => handleNodeDragStart(e, node.id)}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between px-3 py-2 rounded-t-md border-b"
            style={{ backgroundColor: style.bgLight, borderColor: '#E5E7EB' }}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-[var(--neutral-400)] node-handle" />
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: style.bg }}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-medium text-[var(--neutral-900)]">{style.label}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); duplicateNode(node.id); }}
                className="p-1 rounded hover:bg-[var(--neutral-200)] text-[var(--neutral-400)] hover:text-[var(--neutral-600)] transition-colors"
                title="Duplicate"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                className="p-1 rounded hover:bg-[var(--error-light)] text-[var(--neutral-400)] hover:text-[var(--error)] transition-colors"
                title="Delete"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* Template selector */}
          <div className="px-3 py-2 border-b border-[var(--neutral-200)] bg-white relative template-dropdown-container">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTemplateDropdown(showTemplateDropdown === node.id ? null : node.id);
                if (!templates.length && !loadingTemplates) {
                  fetchTemplates();
                }
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm border border-[var(--neutral-300)] rounded-lg hover:border-[var(--primary)] transition-colors bg-white"
            >
              <span className={waNode.data.templateName ? 'text-[var(--neutral-900)]' : 'text-[var(--neutral-400)]'}>
                {waNode.data.templateName || 'Select Template'}
              </span>
              <ChevronDown className={`w-4 h-4 text-[var(--neutral-400)] transition-transform ${showTemplateDropdown === node.id ? 'rotate-180' : ''}`} />
            </button>
            {/* CTA Button - View Analytics */}
            {waNode.data.templateName && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  window.open(`/dashboard/analytics/${encodeURIComponent(waNode.data.templateName || '')}`, '_blank');
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                className="w-full mt-2 px-3 py-2 text-sm font-medium rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] transition-colors flex items-center justify-center gap-2"
                title="View Template Analytics (opens in new tab)"
              >
                <ExternalLink className="w-4 h-4" />
                View Analytics
              </button>
            )}
            {/* Template dropdown */}
            {showTemplateDropdown === node.id && (
              <div className="absolute top-full left-3 right-3 mt-1 bg-white border border-[var(--neutral-200)] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                {loadingTemplates ? (
                  <div className="px-3 py-2 text-xs text-[var(--neutral-500)] flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading templates...
                  </div>
                ) : templates.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-[var(--neutral-500)]">
                    No templates found
                  </div>
                ) : (
                  templates.map((template) => (
                    <button
                      key={template}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateNodeData(node.id, { templateName: template });
                        setShowTemplateDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-[var(--neutral-50)] transition-colors ${
                        waNode.data.templateName === template ? 'bg-[var(--primary-light)] text-[var(--primary)]' : 'text-[var(--neutral-700)]'
                      }`}
                    >
                      {template}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {/* WhatsApp message bubble */}
          <div className="p-3" style={{ height: nodeSize.height - (waNode.data.templateName ? 145 : 100) }}>
            <div className="bg-[#DCF8C6] rounded-lg rounded-tl-none p-3 shadow-sm h-full flex flex-col">
              <div className="flex-1 min-h-0">
                <VariableTextarea
                  value={waNode.data.message}
                  onChange={(e) => updateNodeData(node.id, { message: e.target.value })}
                  className="text-sm text-[var(--neutral-800)]"
                  placeholder="Type your message..."
                />
              </div>
              <div className="flex items-center justify-end gap-1 text-xs text-[#667781] mt-1 flex-shrink-0">
                <span>12:00</span>
                <svg className="w-4 h-4 text-[#53BDEB]" viewBox="0 0 16 15" fill="currentColor">
                  <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.77a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .006.514l3.255 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                </svg>
              </div>
            </div>
          </div>
          {/* Connection points */}
          <div
            className="node-input absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 cursor-crosshair hover:scale-125 transition-transform"
            style={{ borderColor: style.bg }}
            onMouseUp={(e) => handleConnectionEnd(e, node.id, node.type)}
          />
          <div
            className="node-output absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white cursor-crosshair hover:scale-125 transition-transform"
            style={{ backgroundColor: style.bg }}
            onMouseDown={(e) => handleConnectionStart(e, node.id, node.type)}
          />
          {/* Resize handles */}
          <div
            className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize rounded-br-md"
            style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
            onMouseDown={(e) => handleResizeStart(e, node.id, 'se')}
          />
        </div>
      );
    }

    // Event node
    if (nodeType === 'event') {
      const eventNode = node as EventNode;
      return (
        <div
          key={node.id}
          className={`absolute rounded-lg border-2 bg-white shadow-lg transition-shadow pointer-events-auto ${
            isSelected ? 'shadow-xl' : ''
          }`}
          style={{
            left: node.position.x,
            top: node.position.y,
            width: nodeSize.width,
            height: nodeSize.height,
            borderColor: isSelected ? style.bg : '#E5E7EB',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => handleNodeDragStart(e, node.id)}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between px-3 py-2 rounded-t-md border-b"
            style={{ backgroundColor: style.bgLight, borderColor: '#E5E7EB' }}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-[var(--neutral-400)] node-handle" />
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: style.bg }}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-medium text-[var(--neutral-900)]">{style.label}</span>
            </div>
            {canEdit && (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); duplicateNode(node.id); }}
                  className="p-1 rounded hover:bg-[var(--neutral-200)] text-[var(--neutral-400)] hover:text-[var(--neutral-600)] transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                  className="p-1 rounded hover:bg-[var(--error-light)] text-[var(--neutral-400)] hover:text-[var(--error)] transition-colors"
                  title="Delete"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          {/* Event content */}
          <div className="p-3" style={{ height: nodeSize.height - 50 }}>
            <div className="w-full h-full px-3 py-2 border border-[var(--neutral-200)] rounded-lg focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:border-transparent">
              <VariableTextarea
                value={eventNode.data.description}
                onChange={(e) => updateNodeData(node.id, { description: e.target.value })}
                className="text-sm text-[var(--neutral-700)]"
                placeholder="Describe the event trigger..."
              />
            </div>
          </div>
          {/* Connection points */}
          <div
            className="node-input absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 cursor-crosshair hover:scale-125 transition-transform"
            style={{ borderColor: style.bg }}
            onMouseUp={(e) => handleConnectionEnd(e, node.id, node.type)}
          />
          <div
            className="node-output absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white cursor-crosshair hover:scale-125 transition-transform"
            style={{ backgroundColor: style.bg }}
            onMouseDown={(e) => handleConnectionStart(e, node.id, node.type)}
          />
          {/* Resize handle */}
          <div
            className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize rounded-br-md"
            style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
            onMouseDown={(e) => handleResizeStart(e, node.id, 'se')}
          />
        </div>
      );
    }

    // Logic node (also handles legacy 'text' type)
    if (nodeType === 'logic') {
      const logicNode = node as LogicNode;
      return (
        <div
          key={node.id}
          className={`absolute rounded-lg border-2 bg-white shadow-lg transition-shadow pointer-events-auto ${
            isSelected ? 'shadow-xl' : ''
          }`}
          style={{
            left: node.position.x,
            top: node.position.y,
            width: nodeSize.width,
            height: nodeSize.height,
            borderColor: isSelected ? style.bg : '#E5E7EB',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => handleNodeDragStart(e, node.id)}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between px-3 py-2 rounded-t-md border-b"
            style={{ backgroundColor: style.bgLight, borderColor: '#E5E7EB' }}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-[var(--neutral-400)] node-handle" />
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: style.bg }}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-medium text-[var(--neutral-900)]">{style.label}</span>
            </div>
            {canEdit && (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); duplicateNode(node.id); }}
                  className="p-1 rounded hover:bg-[var(--neutral-200)] text-[var(--neutral-400)] hover:text-[var(--neutral-600)] transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                  className="p-1 rounded hover:bg-[var(--error-light)] text-[var(--neutral-400)] hover:text-[var(--error)] transition-colors"
                  title="Delete"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          {/* Logic content */}
          <div className="p-3" style={{ height: nodeSize.height - 50 }}>
            <div className="w-full h-full px-3 py-2 border border-[var(--neutral-200)] rounded-lg focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:border-transparent">
              <VariableTextarea
                value={(logicNode.data as Record<string, string>).description || (logicNode.data as Record<string, string>).condition || (logicNode.data as Record<string, string>).content || ''}
                onChange={(e) => updateNodeData(node.id, { description: e.target.value })}
                className="text-sm text-[var(--neutral-700)]"
                placeholder="Describe the logic condition..."
              />
            </div>
          </div>
          {/* Connection points */}
          <div
            className="node-input absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 cursor-crosshair hover:scale-125 transition-transform"
            style={{ borderColor: style.bg }}
            onMouseUp={(e) => handleConnectionEnd(e, node.id, 'logic')}
          />
          <div
            className="node-output absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white cursor-crosshair hover:scale-125 transition-transform"
            style={{ backgroundColor: style.bg }}
            onMouseDown={(e) => handleConnectionStart(e, node.id, 'logic')}
          />
          {/* Resize handle */}
          <div
            className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize rounded-br-md"
            style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
            onMouseDown={(e) => handleResizeStart(e, node.id, 'se')}
          />
        </div>
      );
    }

    // Journey Link node
    if (nodeType === 'journey') {
      const journeyLinkNode = node as JourneyLinkNode;
      // Filter out current journey from the list - use allJourneys to show journeys from all folders
      const availableJourneys = allJourneys.filter(j => j.id !== currentJourney?.id);
      
      return (
        <div
          key={node.id}
          className={`absolute rounded-lg border-2 bg-white shadow-lg transition-shadow pointer-events-auto ${
            isSelected ? 'shadow-xl' : ''
          }`}
          style={{
            left: node.position.x,
            top: node.position.y,
            width: nodeSize.width,
            height: nodeSize.height,
            borderColor: isSelected ? style.bg : '#E5E7EB',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => handleNodeDragStart(e, node.id)}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between px-3 py-2 rounded-t-md border-b"
            style={{ backgroundColor: style.bgLight, borderColor: '#E5E7EB' }}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-[var(--neutral-400)] node-handle" />
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: style.bg }}>
                <Link2 className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-medium text-[var(--neutral-900)]">{style.label}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); duplicateNode(node.id); }}
                className="p-1 rounded hover:bg-[var(--neutral-200)] text-[var(--neutral-400)] hover:text-[var(--neutral-600)] transition-colors"
                title="Duplicate"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                className="p-1 rounded hover:bg-[var(--error-light)] text-[var(--neutral-400)] hover:text-[var(--error)] transition-colors"
                title="Delete"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* Journey selector */}
          <div className="px-3 py-2 border-b border-[var(--neutral-200)] bg-white relative journey-dropdown-container">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowJourneyDropdown(showJourneyDropdown === node.id ? null : node.id);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm border border-[var(--neutral-300)] rounded-lg hover:border-[var(--primary)] transition-colors bg-white"
            >
              <span className={journeyLinkNode.data.targetJourneyName ? 'text-[var(--neutral-900)]' : 'text-[var(--neutral-400)]'}>
                {journeyLinkNode.data.targetJourneyName || 'Select Journey'}
              </span>
              <ChevronDown className={`w-4 h-4 text-[var(--neutral-400)] transition-transform ${showJourneyDropdown === node.id ? 'rotate-180' : ''}`} />
            </button>
            {/* CTA Button - Open Journey */}
            {journeyLinkNode.data.targetJourneyId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  window.open(`/dashboard/journey-builder?journey=${journeyLinkNode.data.targetJourneyId}`, '_blank');
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                className="w-full mt-2 px-3 py-2 text-sm font-medium rounded-lg bg-[#F97316] text-white hover:bg-[#EA580C] transition-colors flex items-center justify-center gap-2"
                title="Open Journey (opens in new tab)"
              >
                <ExternalLink className="w-4 h-4" />
                Open Journey
              </button>
            )}
            {/* Journey dropdown */}
            {showJourneyDropdown === node.id && (
              <div className="absolute top-full left-3 right-3 mt-1 bg-white border border-[var(--neutral-200)] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                {loadingJourneys ? (
                  <div className="px-3 py-2 text-xs text-[var(--neutral-500)] flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading journeys...
                  </div>
                ) : availableJourneys.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-[var(--neutral-500)]">
                    No other journeys available
                  </div>
                ) : (
                  availableJourneys.map((journey) => (
                    <button
                      key={journey.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateNodeData(node.id, { 
                          targetJourneyId: journey.id,
                          targetJourneyName: journey.name 
                        });
                        setShowJourneyDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-[var(--neutral-50)] transition-colors ${
                        journeyLinkNode.data.targetJourneyId === journey.id ? 'bg-[var(--primary-light)] text-[var(--primary)]' : 'text-[var(--neutral-700)]'
                      }`}
                    >
                      <div className="font-medium">{journey.name}</div>
                      {journey.description && (
                        <div className="text-[var(--neutral-500)] truncate">{journey.description}</div>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {/* Description */}
          <div className="p-3 overflow-hidden" style={{ height: nodeSize.height - (journeyLinkNode.data.targetJourneyId ? 145 : 100) }}>
            <div className="w-full h-full px-3 py-2 border border-[var(--neutral-200)] rounded-lg focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:border-transparent overflow-hidden">
              <VariableTextarea
                value={journeyLinkNode.data.description}
                onChange={(e) => updateNodeData(node.id, { description: e.target.value })}
                className="text-sm text-[var(--neutral-700)]"
                placeholder="Add description..."
              />
            </div>
          </div>
          {/* Connection points */}
          <div
            className="node-input absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 cursor-crosshair hover:scale-125 transition-transform"
            style={{ borderColor: style.bg }}
            onMouseUp={(e) => handleConnectionEnd(e, node.id, node.type)}
          />
          <div
            className="node-output absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white cursor-crosshair hover:scale-125 transition-transform"
            style={{ backgroundColor: style.bg }}
            onMouseDown={(e) => handleConnectionStart(e, node.id, node.type)}
          />
          {/* Resize handle */}
          <div
            className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize rounded-br-md"
            style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
            onMouseDown={(e) => handleResizeStart(e, node.id, 'se')}
          />
        </div>
      );
    }

    // Fallback for any unknown node types - render as logic node
    return null;
  };

  // Journey list view
  if (!currentJourney) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--neutral-900)]">Journey Builder</h1>
            <p className="text-[var(--neutral-500)] mt-1">Create and manage message flows</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setShowCreateGroupModal(true)} disabled={!canEdit}>
              <FolderPlus className="w-4 h-4 mr-2" />
              New Group
            </Button>
            <Button onClick={() => setShowCreateModal(true)} disabled={!canEdit}>
              <Plus className="w-4 h-4 mr-2" />
              New Journey
            </Button>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        {groupPath.length > 0 && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            <button
              onClick={() => navigateToBreadcrumb(-1)}
              className="flex items-center gap-1 text-[var(--neutral-600)] hover:text-[var(--primary)] transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>
            {groupPath.map((group, index) => (
              <div key={group.id} className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-[var(--neutral-400)]" />
                <button
                  onClick={() => navigateToBreadcrumb(index)}
                  className={`hover:text-[var(--primary)] transition-colors ${
                    index === groupPath.length - 1 
                      ? 'font-medium text-[var(--neutral-900)]' 
                      : 'text-[var(--neutral-600)]'
                  }`}
                >
                  {group.name}
                </button>
              </div>
            ))}
          </div>
        )}

        {loadingJourneys ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
          </div>
        ) : groups.length === 0 && journeys.length === 0 ? (
          <Card className="text-center py-12">
            <FileText className="w-12 h-12 text-[var(--neutral-300)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--neutral-900)] mb-2">
              {groupPath.length > 0 ? 'This folder is empty' : 'No journeys yet'}
            </h3>
            <p className="text-sm text-[var(--neutral-500)] mb-4">
              {groupPath.length > 0 
                ? 'Create a journey or sub-group here'
                : 'Create your first journey to start building message flows'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="secondary" onClick={() => setShowCreateGroupModal(true)} disabled={!canEdit}>
                <FolderPlus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
              <Button onClick={() => setShowCreateModal(true)} disabled={!canEdit}>
                <Plus className="w-4 h-4 mr-2" />
                Create Journey
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Groups */}
            {groups.map(group => (
              <Card 
                key={group.id}
                className="cursor-pointer hover:border-[var(--primary)] transition-colors bg-[var(--neutral-50)]"
                onClick={() => navigateToGroup(group)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-[var(--primary-light)]">
                      <FolderOpen className="w-5 h-5 text-[var(--primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[var(--neutral-900)] truncate">
                        {group.name}
                      </h3>
                      {group.description && (
                        <p className="text-sm text-[var(--neutral-500)] mt-1 line-clamp-1">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="relative three-dot-menu">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === `group-${group.id}` ? null : `group-${group.id}`);
                        }}
                        className="p-2 rounded-lg hover:bg-[var(--neutral-200)] text-[var(--neutral-400)] hover:text-[var(--neutral-600)] transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenuId === `group-${group.id}` && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-[var(--neutral-200)] rounded-lg shadow-lg z-50">
                          <button
                            onClick={(e) => openEditGroupModal(group, e)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-[var(--neutral-50)] transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteGroup(group.id);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-[var(--error)] hover:bg-[var(--error-light)] transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}

            {/* Journeys */}
            {journeys.map(journey => (
              <Card 
                key={journey.id}
                className="cursor-pointer hover:border-[var(--primary)] transition-colors"
                onClick={() => loadJourney(journey)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[var(--neutral-900)] truncate">
                      {journey.name}
                    </h3>
                    {journey.description && (
                      <p className="text-sm text-[var(--neutral-500)] mt-1 line-clamp-2">
                        {journey.description}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="relative three-dot-menu">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === `journey-${journey.id}` ? null : `journey-${journey.id}`);
                        }}
                        className="p-2 rounded-lg hover:bg-[var(--neutral-100)] text-[var(--neutral-400)] hover:text-[var(--neutral-600)] transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenuId === `journey-${journey.id}` && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-[var(--neutral-200)] rounded-lg shadow-lg z-50">
                          <button
                            onClick={(e) => openEditJourneyModal(journey, e)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-[var(--neutral-50)] transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => openMoveModal(journey, e)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-[var(--neutral-50)] transition-colors"
                          >
                            <MoveHorizontal className="w-4 h-4" />
                            Move
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              deleteJourney(journey.id);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-[var(--error)] hover:bg-[var(--error-light)] transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create Journey Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Journey"
        >
          <div className="space-y-4">
            <Input
              label="Journey Name"
              value={newJourneyName}
              onChange={(e) => setNewJourneyName(e.target.value)}
              placeholder="e.g., Welcome Flow"
              required
            />
            <div>
              <label className="block text-sm font-medium text-[var(--neutral-700)] mb-1">
                Description (optional)
              </label>
              <textarea
                value={newJourneyDescription}
                onChange={(e) => setNewJourneyDescription(e.target.value)}
                placeholder="Describe what this journey does..."
                className="w-full px-4 py-2 border border-[var(--neutral-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-none"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={createJourney} loading={creating} disabled={!newJourneyName.trim()}>
                Create Journey
              </Button>
            </div>
          </div>
        </Modal>

        {/* Edit Journey Modal */}
        <Modal
          isOpen={showEditJourneyModal}
          onClose={() => {
            setShowEditJourneyModal(false);
            setEditingJourney(null);
          }}
          title="Edit Journey"
        >
          <div className="space-y-4">
            <Input
              label="Journey Name"
              value={editJourneyName}
              onChange={(e) => setEditJourneyName(e.target.value)}
              placeholder="e.g., Welcome Flow"
              required
            />
            <div>
              <label className="block text-sm font-medium text-[var(--neutral-700)] mb-1">
                Description (optional)
              </label>
              <textarea
                value={editJourneyDescription}
                onChange={(e) => setEditJourneyDescription(e.target.value)}
                placeholder="Describe what this journey does..."
                className="w-full px-4 py-2 border border-[var(--neutral-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-none"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => {
                setShowEditJourneyModal(false);
                setEditingJourney(null);
              }}>
                Cancel
              </Button>
              <Button onClick={updateJourneyDetails} loading={updatingJourney} disabled={!editJourneyName.trim()}>
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>

        {/* Create Group Modal */}
        <Modal
          isOpen={showCreateGroupModal}
          onClose={() => setShowCreateGroupModal(false)}
          title="Create New Group"
        >
          <div className="space-y-4">
            <Input
              label="Group Name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g., Marketing Flows"
              required
            />
            <div>
              <label className="block text-sm font-medium text-[var(--neutral-700)] mb-1">
                Description (optional)
              </label>
              <textarea
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Describe what journeys this group contains..."
                className="w-full px-4 py-2 border border-[var(--neutral-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-none"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowCreateGroupModal(false)}>
                Cancel
              </Button>
              <Button onClick={createGroup} loading={creatingGroup} disabled={!newGroupName.trim()}>
                Create Group
              </Button>
            </div>
          </div>
        </Modal>

        {/* Edit Group Modal */}
        <Modal
          isOpen={showEditGroupModal}
          onClose={() => {
            setShowEditGroupModal(false);
            setEditingGroup(null);
          }}
          title="Edit Group"
        >
          <div className="space-y-4">
            <Input
              label="Group Name"
              value={editGroupName}
              onChange={(e) => setEditGroupName(e.target.value)}
              placeholder="e.g., Marketing Flows"
              required
            />
            <div>
              <label className="block text-sm font-medium text-[var(--neutral-700)] mb-1">
                Description (optional)
              </label>
              <textarea
                value={editGroupDescription}
                onChange={(e) => setEditGroupDescription(e.target.value)}
                placeholder="Describe what journeys this group contains..."
                className="w-full px-4 py-2 border border-[var(--neutral-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-none"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => {
                setShowEditGroupModal(false);
                setEditingGroup(null);
              }}>
                Cancel
              </Button>
              <Button onClick={updateGroupDetails} loading={updatingGroup} disabled={!editGroupName.trim()}>
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>

        {/* Move Journey Modal */}
        <Modal
          isOpen={showMoveModal}
          onClose={() => {
            setShowMoveModal(false);
            setMovingJourney(null);
          }}
          title="Move Journey"
        >
          <div className="space-y-4">
            <p className="text-sm text-[var(--neutral-600)]">
              Move <span className="font-medium">{movingJourney?.name}</span> to:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {/* Root option */}
              <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--neutral-200)] cursor-pointer hover:bg-[var(--neutral-50)] transition-colors">
                <input
                  type="radio"
                  name="moveTarget"
                  checked={moveTargetGroupId === null}
                  onChange={() => setMoveTargetGroupId(null)}
                  className="w-4 h-4 text-[var(--primary)]"
                />
                <Home className="w-4 h-4 text-[var(--neutral-500)]" />
                <span className="text-sm">Root (Home)</span>
              </label>
              {/* Group options */}
              {allGroups.map(group => (
                <label 
                  key={group.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[var(--neutral-200)] cursor-pointer hover:bg-[var(--neutral-50)] transition-colors"
                >
                  <input
                    type="radio"
                    name="moveTarget"
                    checked={moveTargetGroupId === group.id}
                    onChange={() => setMoveTargetGroupId(group.id)}
                    className="w-4 h-4 text-[var(--primary)]"
                  />
                  <FolderOpen className="w-4 h-4 text-[var(--primary)]" />
                  <span className="text-sm">{group.name}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => {
                setShowMoveModal(false);
                setMovingJourney(null);
              }}>
                Cancel
              </Button>
              <Button onClick={moveJourney} loading={movingJourneyInProgress}>
                Move Journey
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // Canvas editor view
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--neutral-200)] bg-white">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (hasUnsavedChanges && canEdit) {
                saveJourney();
              }
              setCurrentJourney(null);
              fetchJourneys();
            }}
            className="p-2 rounded-lg hover:bg-[var(--neutral-100)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--neutral-600)]" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-[var(--neutral-900)]">{currentJourney.name}</h1>
            <div className="flex items-center gap-2 text-xs text-[var(--neutral-500)]">
              {saving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Save className="w-3 h-3" />
                  <span>Saved {lastSaved.toLocaleTimeString()}</span>
                </>
              ) : null}
              {hasUnsavedChanges && !saving && (
                <span className="text-[var(--warning)]">• Unsaved changes</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-[var(--neutral-100)] rounded-lg p-1">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded hover:bg-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 text-[var(--neutral-600)]" />
            </button>
            <span className="text-xs font-medium text-[var(--neutral-600)] w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded hover:bg-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 text-[var(--neutral-600)]" />
            </button>
            <button
              onClick={handleZoomReset}
              className="p-1.5 rounded hover:bg-white transition-colors"
              title="Reset View"
            >
              <Maximize2 className="w-4 h-4 text-[var(--neutral-600)]" />
            </button>
            <button
              onClick={handleFitToScreen}
              className="p-1.5 rounded hover:bg-white transition-colors"
              title="Fit to Screen (Show All Nodes)"
            >
              <Focus className="w-4 h-4 text-[var(--neutral-600)]" />
            </button>
          </div>
          
          {/* Save Button */}
          <Button 
            variant="secondary" 
            onClick={saveJourney}
            disabled={saving || !hasUnsavedChanges || !canEdit}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save
          </Button>
          
          {/* Add Node Dropdown */}
          <div className="relative" ref={addMenuRef}>
            <Button onClick={() => setShowAddMenu(!showAddMenu)} disabled={!canEdit}>
              <Plus className="w-4 h-4 mr-2" />
              Add Node
              <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showAddMenu ? 'rotate-180' : ''}`} />
            </Button>
            
            {showAddMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-[var(--neutral-200)] py-2 z-50">
                <button
                  onClick={() => addNode('whatsapp')}
                  className="flex items-center gap-3 w-full px-4 py-2 hover:bg-[var(--neutral-50)] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: NODE_STYLES.whatsapp.bgLight }}>
                    <MessageSquare className="w-4 h-4" style={{ color: NODE_STYLES.whatsapp.bg }} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[var(--neutral-900)]">WhatsApp Message</p>
                    <p className="text-xs text-[var(--neutral-500)]">Send a WhatsApp message</p>
                  </div>
                </button>
                <button
                  onClick={() => addNode('event')}
                  className="flex items-center gap-3 w-full px-4 py-2 hover:bg-[var(--neutral-50)] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: NODE_STYLES.event.bgLight }}>
                    <Zap className="w-4 h-4" style={{ color: NODE_STYLES.event.bg }} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[var(--neutral-900)]">Event / Webhook</p>
                    <p className="text-xs text-[var(--neutral-500)]">Catch incoming events</p>
                  </div>
                </button>
                <button
                  onClick={() => addNode('logic')}
                  className="flex items-center gap-3 w-full px-4 py-2 hover:bg-[var(--neutral-50)] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: NODE_STYLES.logic.bgLight }}>
                    <GitBranch className="w-4 h-4" style={{ color: NODE_STYLES.logic.bg }} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[var(--neutral-900)]">Logic</p>
                    <p className="text-xs text-[var(--neutral-500)]">Add conditional logic</p>
                  </div>
                </button>
                <button
                  onClick={() => addNode('table')}
                  className="flex items-center gap-3 w-full px-4 py-2 hover:bg-[var(--neutral-50)] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: NODE_STYLES.table.bgLight }}>
                    <Table2 className="w-4 h-4" style={{ color: NODE_STYLES.table.border }} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[var(--neutral-900)]">Table</p>
                    <p className="text-xs text-[var(--neutral-500)]">Add data tables</p>
                  </div>
                </button>
                <button
                  onClick={() => addNode('journey')}
                  className="flex items-center gap-3 w-full px-4 py-2 hover:bg-[var(--neutral-50)] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: NODE_STYLES.journey.bgLight }}>
                    <Link2 className="w-4 h-4" style={{ color: NODE_STYLES.journey.border }} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[var(--neutral-900)]">Journey Link</p>
                    <p className="text-xs text-[var(--neutral-500)]">Link to another journey</p>
                  </div>
                </button>
                <div className="border-t border-[var(--neutral-200)] my-2" />
                <button
                  onClick={() => addNode('sticky')}
                  className="flex items-center gap-3 w-full px-4 py-2 hover:bg-[var(--neutral-50)] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: NODE_STYLES.sticky.bgLight }}>
                    <StickyNote className="w-4 h-4" style={{ color: NODE_STYLES.sticky.border }} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[var(--neutral-900)]">Sticky Note</p>
                    <p className="text-xs text-[var(--neutral-500)]">Add notes & descriptions</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div 
        ref={canvasRef}
        className="flex-1 relative overflow-hidden bg-[var(--neutral-50)]"
        onMouseDown={handleCanvasPanStart}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        {/* Grid Background - clickable for panning */}
        <div 
          className="absolute inset-0 canvas-background"
          style={{
            backgroundImage: `
              linear-gradient(to right, var(--neutral-200) 1px, transparent 1px),
              linear-gradient(to bottom, var(--neutral-200) 1px, transparent 1px)
            `,
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />

        {/* SVG Layer for Connections */}
        <svg 
          ref={svgRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ overflow: 'visible' }}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Existing Connections */}
            {connections.map(conn => {
              const startPos = getNodeConnectionPoint(conn.sourceId, true);
              const endPos = getNodeConnectionPoint(conn.targetId, false);
              const sourceNode = nodes.find(n => n.id === conn.sourceId);
              // Handle legacy 'text' type
              const sourceType = sourceNode ? ((sourceNode.type === 'text' as unknown) ? 'logic' : sourceNode.type) : 'logic';
              const color = NODE_STYLES[sourceType as keyof typeof NODE_STYLES]?.bg || '#3B82F6';
              // Calculate midpoint for delete button
              const midX = (startPos.x + endPos.x) / 2;
              const midY = (startPos.y + endPos.y) / 2;
              return (
                <g key={conn.id} className="pointer-events-auto group">
                  {/* Invisible wider path for easier hover/click */}
                  <path
                    d={getBezierPath(startPos, endPos)}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="20"
                    className="cursor-pointer"
                    onClick={() => deleteConnection(conn.id)}
                  />
                  {/* Visible path */}
                  <path
                    d={getBezierPath(startPos, endPos)}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    className="group-hover:stroke-[var(--error)] transition-colors pointer-events-none"
                  />
                  {/* End circle */}
                  <circle
                    cx={endPos.x}
                    cy={endPos.y}
                    r="4"
                    fill={color}
                    className="group-hover:fill-[var(--error)] transition-colors pointer-events-none"
                  />
                  {/* Delete button on hover */}
                  <g 
                    className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => deleteConnection(conn.id)}
                  >
                    <circle
                      cx={midX}
                      cy={midY}
                      r="12"
                      fill="var(--error)"
                    />
                    <line
                      x1={midX - 4}
                      y1={midY - 4}
                      x2={midX + 4}
                      y2={midY + 4}
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1={midX + 4}
                      y1={midY - 4}
                      x2={midX - 4}
                      y2={midY + 4}
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </g>
                </g>
              );
            })}

            {/* Active Connection Line */}
            {connecting && (
              <path
                d={getBezierPath(connecting.startPos, mousePos)}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}
          </g>
        </svg>

        {/* Nodes Layer */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {nodes.map(node => renderNode(node))}
        </div>

        {/* Empty State */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Card className="text-center p-8 pointer-events-auto">
              <GitBranch className="w-12 h-12 text-[var(--neutral-300)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--neutral-900)] mb-2">
                Start Building Your Journey
              </h3>
              <p className="text-sm text-[var(--neutral-500)] mb-4">
                Add nodes to create your message flow
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="secondary" onClick={() => addNode('event')}>
                  <Zap className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
                <Button onClick={() => addNode('whatsapp')}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Add WhatsApp
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Edit Restriction Modal */}
      <Modal
        isOpen={showEditRestrictionModal}
        onClose={() => setShowEditRestrictionModal(false)}
        title=""
      >
        <div className="text-center py-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-[var(--warning-light)] flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-[var(--warning)]" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-[var(--neutral-900)] mb-2">
            Journey is Live
          </h3>
          <p className="text-[var(--neutral-600)] mb-6">
            Please contact admin to edit this journey.
          </p>
          <Button onClick={() => setShowEditRestrictionModal(false)}>
            Understood
          </Button>
        </div>
      </Modal>
    </div>
  );
}
