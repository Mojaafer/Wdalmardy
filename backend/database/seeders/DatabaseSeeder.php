<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['slug' => 'fruits-vegetables', 'name_ar' => 'خضروات وفواكه', 'name_en' => 'Fruits & Vegetables', 'image' => null],
            ['slug' => 'groceries',         'name_ar' => 'مواد غذائية',   'name_en' => 'Groceries',           'image' => null],
            ['slug' => 'dairy',             'name_ar' => 'ألبان ومنتجات', 'name_en' => 'Dairy',               'image' => null],
            ['slug' => 'meat-poultry',      'name_ar' => 'لحوم ودواجن',   'name_en' => 'Meat & Poultry',      'image' => null],
            ['slug' => 'cleaning-care',     'name_ar' => 'منظفات وعناية', 'name_en' => 'Cleaning & Care',     'image' => null],
            ['slug' => 'beverages',         'name_ar' => 'مشروبات',       'name_en' => 'Beverages',           'image' => null],
            ['slug' => 'bakery',            'name_ar' => 'مخبوزات',       'name_en' => 'Bakery',              'image' => null],
            ['slug' => 'snacks-sweets',     'name_ar' => 'سناكس وحلويات', 'name_en' => 'Snacks & Sweets',     'image' => null],
        ];

        foreach ($categories as $i => $row) {
            Category::updateOrCreate(['slug' => $row['slug']], [...$row, 'sort_order' => $i, 'is_active' => true]);
        }

        $products = [
            ['cat' => 'groceries', 'slug' => 'rice-aldameer-5kg',  'name_ar' => 'أرز الضمير 5 كيلو', 'name_en' => 'Aldameer Rice 5kg',     'price' => 4500, 'compare' => 5500, 'unit_ar' => '5 كيلو', 'unit_en' => '5 kg',  'featured' => true, 'rating' => 4.5, 'reviews' => 128, 'image' => null],
            ['cat' => 'groceries', 'slug' => 'sunflower-oil-1-8l', 'name_ar' => 'زيت زين 1.8 لتر',  'name_en' => 'Zain Sunflower Oil 1.8L', 'price' => 3200, 'compare' => 3900, 'unit_ar' => '1.8 لتر', 'unit_en' => '1.8 L', 'featured' => true, 'rating' => 4.3, 'reviews' => 86,  'image' => null],
            ['cat' => 'groceries', 'slug' => 'sugar-2kg',          'name_ar' => 'سكر الأسرة 2 كيلو', 'name_en' => 'Family Sugar 2kg',        'price' => 2000, 'compare' => 2600, 'unit_ar' => '2 كيلو', 'unit_en' => '2 kg',  'featured' => true, 'rating' => 4.6, 'reviews' => 54,  'image' => null],
            ['cat' => 'dairy',     'slug' => 'milk-almaraei-1l',   'name_ar' => 'حليب المراعي 1 لتر', 'name_en' => 'Almarai Milk 1L',         'price' => 1100, 'compare' => 1450, 'unit_ar' => '1 لتر', 'unit_en' => '1 L',   'featured' => true, 'rating' => 4.7, 'reviews' => 210, 'image' => null],
            ['cat' => 'dairy',     'slug' => 'cheese-almaraei-500g', 'name_ar' => 'جبنة المراعي 500 جم', 'name_en' => 'Almarai Cheese 500g',      'price' => 3700, 'compare' => null, 'unit_ar' => '500 جم', 'unit_en' => '500 g', 'featured' => false, 'rating' => 4.4, 'reviews' => 31, 'image' => null],
            ['cat' => 'dairy',     'slug' => 'yogurt-mustansir-2kg', 'name_ar' => 'سكر كنانة 2 كيلو',  'name_en' => 'Kanana Sugar 2kg',         'price' => 2000, 'compare' => 2600, 'unit_ar' => '2 كيلو', 'unit_en' => '2 kg', 'featured' => false, 'rating' => 4.2, 'reviews' => 19, 'image' => null],
            ['cat' => 'fruits-vegetables', 'slug' => 'eggs-30',    'name_ar' => 'بيض بلدي 30 حبة',    'name_en' => 'Local Eggs 30',           'price' => 2800, 'compare' => null, 'unit_ar' => '30 حبة', 'unit_en' => '30 pcs', 'featured' => true, 'rating' => 4.5, 'reviews' => 64, 'image' => null],
            ['cat' => 'meat-poultry', 'slug' => 'chicken-1kg',      'name_ar' => 'دجاج طازج 1 كيلو',   'name_en' => 'Fresh Chicken 1kg',       'price' => 5500, 'compare' => null, 'unit_ar' => '1 كيلو', 'unit_en' => '1 kg', 'featured' => false, 'rating' => 4.6, 'reviews' => 41, 'image' => null],
            ['cat' => 'meat-poultry', 'slug' => 'beef-1kg',         'name_ar' => 'لحم بقري 1 كيلو',    'name_en' => 'Beef 1kg',                'price' => 9500, 'compare' => null, 'unit_ar' => '1 كيلو', 'unit_en' => '1 kg', 'featured' => false, 'rating' => 4.4, 'reviews' => 22, 'image' => null],
            ['cat' => 'groceries', 'slug' => 'flour-1kg',          'name_ar' => 'دقيق الامتياز 1 كيلو', 'name_en' => 'Premium Flour 1kg',       'price' => 1000, 'compare' => null, 'unit_ar' => '1 كيلو', 'unit_en' => '1 kg', 'featured' => false, 'rating' => 4.1, 'reviews' => 12, 'image' => null],
            ['cat' => 'groceries', 'slug' => 'pasta-400g',         'name_ar' => 'مكرونة العلالي 400 جم', 'name_en' => 'Alalali Pasta 400g',     'price' => 900,  'compare' => null, 'unit_ar' => '400 جم', 'unit_en' => '400 g', 'featured' => false, 'rating' => 4.3, 'reviews' => 18, 'image' => null],
            ['cat' => 'beverages', 'slug' => 'juice-rani-1l',      'name_ar' => 'عصير راني 1 لتر',    'name_en' => 'Rani Juice 1L',           'price' => 1300, 'compare' => null, 'unit_ar' => '1 لتر', 'unit_en' => '1 L', 'featured' => false, 'rating' => 4.0, 'reviews' => 8,  'image' => null],
            ['cat' => 'beverages', 'slug' => 'tea-100g',           'name_ar' => 'شاي الكوس 100 جم',   'name_en' => 'Alkoss Tea 100g',         'price' => 950,  'compare' => null, 'unit_ar' => '100 جم', 'unit_en' => '100 g', 'featured' => false, 'rating' => 4.5, 'reviews' => 27, 'image' => null],
            ['cat' => 'beverages', 'slug' => 'water-1-5l',         'name_ar' => 'مياه صفا 1.5 لتر',   'name_en' => 'Safa Water 1.5L',         'price' => 350,  'compare' => null, 'unit_ar' => '1.5 لتر', 'unit_en' => '1.5 L', 'featured' => false, 'rating' => 4.2, 'reviews' => 15, 'image' => null],
            ['cat' => 'cleaning-care', 'slug' => 'detergent-tide-2-5kg', 'name_ar' => 'مسحوق غسيل تايد 2.5 كيلو', 'name_en' => 'Tide Detergent 2.5kg', 'price' => 4250, 'compare' => 5000, 'unit_ar' => '2.5 كيلو', 'unit_en' => '2.5 kg', 'featured' => false, 'rating' => 4.4, 'reviews' => 33, 'image' => null],
            ['cat' => 'cleaning-care', 'slug' => 'tissues-fine-10', 'name_ar' => 'مناديل فين 10 رول',  'name_en' => 'Fine Tissues 10 rolls',   'price' => 1850, 'compare' => null, 'unit_ar' => '10 رول', 'unit_en' => '10 rolls', 'featured' => false, 'rating' => 4.3, 'reviews' => 21, 'image' => null],
            ['cat' => 'cleaning-care', 'slug' => 'fairy-750ml',     'name_ar' => 'سائل جلي فيري 750 مل', 'name_en' => 'Fairy Dish Liquid 750ml', 'price' => 1600, 'compare' => null, 'unit_ar' => '750 مل', 'unit_en' => '750 ml', 'featured' => false, 'rating' => 4.6, 'reviews' => 47, 'image' => null],
            ['cat' => 'snacks-sweets', 'slug' => 'galaxy-chocolate', 'name_ar' => 'شوكولاتة جالاكسي',    'name_en' => 'Galaxy Chocolate',         'price' => 1200, 'compare' => null, 'unit_ar' => 'قطعة',   'unit_en' => 'piece', 'featured' => false, 'rating' => 4.7, 'reviews' => 88, 'image' => null],
            ['cat' => 'bakery',    'slug' => 'bread-pack',         'name_ar' => 'خبز عربي',           'name_en' => 'Arabic Bread',            'price' => 500,  'compare' => null, 'unit_ar' => 'كيس',    'unit_en' => 'bag',   'featured' => false, 'rating' => 4.4, 'reviews' => 16, 'image' => null],
            ['cat' => 'fruits-vegetables', 'slug' => 'tomato-1kg',  'name_ar' => 'طماطم 1 كيلو',       'name_en' => 'Tomato 1kg',              'price' => 800,  'compare' => null, 'unit_ar' => '1 كيلو', 'unit_en' => '1 kg', 'featured' => false, 'rating' => 4.3, 'reviews' => 9,  'image' => null],
            ['cat' => 'fruits-vegetables', 'slug' => 'banana-1kg',  'name_ar' => 'موز 1 كيلو',         'name_en' => 'Banana 1kg',              'price' => 1200, 'compare' => null, 'unit_ar' => '1 كيلو', 'unit_en' => '1 kg', 'featured' => false, 'rating' => 4.5, 'reviews' => 11, 'image' => null],
            ['cat' => 'fruits-vegetables', 'slug' => 'apple-1kg',   'name_ar' => 'تفاح 1 كيلو',        'name_en' => 'Apple 1kg',               'price' => 1800, 'compare' => null, 'unit_ar' => '1 كيلو', 'unit_en' => '1 kg', 'featured' => false, 'rating' => 4.4, 'reviews' => 14, 'image' => null],
            ['cat' => 'snacks-sweets', 'slug' => 'lays-chips',      'name_ar' => 'شيبس ليز',            'name_en' => 'Lays Chips',              'price' => 600,  'compare' => null, 'unit_ar' => 'كيس',    'unit_en' => 'bag',   'featured' => false, 'rating' => 4.5, 'reviews' => 39, 'image' => null],
            ['cat' => 'beverages', 'slug' => 'cola-1l',            'name_ar' => 'كوكاكولا 1 لتر',     'name_en' => 'Coca-Cola 1L',            'price' => 1100, 'compare' => null, 'unit_ar' => '1 لتر', 'unit_en' => '1 L',   'featured' => false, 'rating' => 4.6, 'reviews' => 52, 'image' => null],
        ];

        foreach ($products as $i => $p) {
            $category = Category::where('slug', $p['cat'])->firstOrFail();
            Product::updateOrCreate(
                ['slug' => $p['slug']],
                [
                    'category_id' => $category->id,
                    'name_ar' => $p['name_ar'],
                    'name_en' => $p['name_en'],
                    'description_ar' => 'منتج عالي الجودة من ود المرضي ماركت. '.$p['name_ar'].'، طازج ومضمون 100%.',
                    'description_en' => 'Premium quality product from Wad Almardi Market. Fresh and 100% guaranteed.',
                    'image' => $p['image'],
                    'price' => $p['price'],
                    'compare_at_price' => $p['compare'],
                    'unit_ar' => $p['unit_ar'],
                    'unit_en' => $p['unit_en'],
                    'stock' => 100,
                    'is_featured' => $p['featured'],
                    'is_active' => true,
                    'sort_order' => $i,
                    'rating' => $p['rating'],
                    'reviews_count' => $p['reviews'],
                ]
            );
        }

        $this->call(AdminSeeder::class);
        $this->call(PhaseBSeeder::class);
        $this->call(PhaseB2Seeder::class);
    }
}
