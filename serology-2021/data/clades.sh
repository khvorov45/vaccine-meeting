cd seasonal-flu-master

./assign_clades.py --sequences ../data/seq-nuc-for-clade-id-h1.fasta --lineage h1n1pdm > ../data/clades-h1.tsv
./assign_clades.py --sequences ../data/seq-nuc-for-clade-id-h3.fasta --lineage h3n2 > ../data/clades-h3.tsv
./assign_clades.py --sequences ../data/seq-nuc-for-clade-id-bvic.fasta --lineage vic > ../data/clades-bvic.tsv
