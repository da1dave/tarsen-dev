-- El bucket de fotos solo acepta imágenes de hasta 5 MB (el editor las comprime a WebP/JPG de máx. 1600 px).
-- Evita que alguien use el bucket público para alojar otro tipo de archivos.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png']
where id = 'fotos';
