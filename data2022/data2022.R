library(tidyverse)

quick_summary <- function(data) {
	walk(colnames(data), function(colname) {
		cat(crayon::red(paste0(colname, ": ")))
		unique_vals <- unique(data[[colname]])
		unique_vals_short <- unique_vals
		end_str <- ""
		if (length(unique_vals) > 10) {
			unique_vals_short <- unique_vals[1:10]
			end_str <- crayon::red(" ...")
		}
		unique_vals_short <- sort(unique_vals_short, na.last = FALSE)
		cat(paste(map_chr(unique_vals_short, function(val) {
			if (is.na(val)) {
				crayon::magenta(val)
			} else if (is.character(val)) {
				paste0("'", crayon::cyan(val), "'")
			} else if (is.numeric(val)) {
				crayon::green(val)
			} else if (is.logical(val)) {
				crayon::yellow(val)
			} else {
				crayon::red(val)
			}
		}), collapse = " "))
		cat(end_str, "\n", sep = "")
	})
}

nh_stats <- read_delim("data2022/2022_NH.stats.txt", col_types = cols())
nh_titres <- read_delim(
	"data2022/2022_NH.titers.txt",
	# NOTE(sen) I assume the columns are the same in NH.stats and NH.titres
	col_names = c(
		"year", "hemisphere", "type", "test", "testing_lab", "location", "serum_lab", "cohort",
		"strain", "passage", "antigen", "pid", "prevax", "postvax", "vaccine"
	),
	col_types = cols()
)

quick_summary(nh_stats)
quick_summary(nh_titres)

vis2022 <- nh_titres %>%
	pivot_longer(c(prevax, postvax), names_to = "timepoint", values_to = "titre") %>%
	mutate(
		clade = "uncladed",
		timepoint = recode(timepoint, "prevax" = "Pre-vax", "postvax" = "Post-vax"),
		egg_cell = if_else(passage == "Egg", "Egg", "Cell"),
		clade_freq = 0.5,
		virus = paste0(strain, if_else(egg_cell == "Egg", "e", "")) %>%
			tolower() %>%
			tools::toTitleCase() %>%
			str_replace("^a/", "A/") %>%
			str_replace("^b/", "B/"),
		serum_id = paste(testing_lab, cohort, serum_lab, vaccine, pid, sep = "__")
	) %>%
	select(
		serum_id, cohort, virus, clade, titre, subtype = type, timepoint,
		egg_cell, serum_source = location, vaccine = vaccine, testing_lab, clade_freq,
	) %>%
	mutate(
		vaccine_strain = virus %in% c(
			"A/Darwin/6/2021e",
			"A/Victoria/2570/2019e",
			"B/Washington/02/2019e",
			"B/Phuket/3073/2013e"
	    ),
	)

quick_summary(vis2022)

write_csv(vis2022, "data2022/vis2022.csv")
write_csv(vis2022, "titre-visualizer/vis2022.csv")