import Menu from "../models/Menu.js";

export const getMenus = async (req, res) => {
    try {
        const role = req.query.role;
        if (!role) return res.status(400).json({ error: "Role is required" });

        const menu = await Menu.findOne({ role });
        if (!menu) return res.status(404).json({ error: "Menu not found" });

        res.json(menu.items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
