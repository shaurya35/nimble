type Folder = {
    id: string;
    name: string;
    color?: string | null;
    iconKey?: string | null;
    createdAt: string;
};

type Note = {
    id: string;
    title: string;
    content: string;
    folderId: string | null;
    createdAt: string;
    updatedAt: string;
    tags: string[];
}

export { Folder, Note };