import { useDroppable } from '@dnd-kit/core';

interface Props {
    id: string;
    children?: React.ReactNode;
}

export const GridSlot = ({ id, children }: Props) => {
    const { isOver, setNodeRef } = useDroppable({
        id,
    });

    return (
        <div
            ref={setNodeRef}
            className={`grid-cell ${isOver ? 'active' : ''}`}
        >
            {children}
        </div>
    );
};
