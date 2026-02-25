import { useDraggable } from '@dnd-kit/core';

interface Props {
    id: string;
    data: any;
    label: string;
}

export const DraggableItem = ({ id, data, label }: Props) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id,
        data,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="draggable-item"
        >
            {label}
        </div>
    );
};
